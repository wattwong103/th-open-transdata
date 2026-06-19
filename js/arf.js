/* =============================================================
   TODM — Transportation Open Data Map
   Renders the collapsible D3 source tree (browse mode) and a
   search + tag-facet result list (find mode) over arf.json.
   Node colors mirror the design-system dataviz tokens.
   ============================================================= */

var margin = [20, 60, 20, 60],
    width = window.innerWidth - margin[1] - margin[3],
    height = window.innerHeight * 0.9 - margin[0] - margin[2],
    i = 0,
    duration = 1250,
    root;

var tree = d3.tree()
    .size([height, width]);

var diagonal = d3.linkHorizontal()
    .x(d => d.y)
    .y(d => d.x);

/* ---- Node colors by depth (mirror tokens/dataviz.css) ---- */
function nodeColor(d) {
  if (d.depth === 0) return "#1a4c82"; // navy-600 — root anchor
  if (d.depth === 1) return "#4f8dd6"; // viz-1 blue — categories
  if (d.depth === 2) return "#e8633f"; // viz-3 coral — sub-categories
  return "#2fb6a8";                    // viz-2 teal — leaves
}
function nodeColorLight(d) {
  if (d.depth === 0) return "#4f8dd6";
  if (d.depth === 1) return "#6fa3d6";
  if (d.depth === 2) return "#f08a6e";
  return "#5fcabd";
}
function nodeStroke(d) {
  if (d.depth === 0) return "#4f8dd6";
  if (d.depth === 1) return "#6fa3d6";
  if (d.depth === 2) return "#f08a6e";
  return "#5fcabd";
}

/* ---- SVG canvas with zoom ---- */
var zoom = d3.zoom()
    .scaleExtent([0.3, 3])
    .on("zoom", (event) => {
      vis.attr("transform", event.transform);
    });

var svg = d3.select("#body").append("svg")
    .attr("width", width + margin[1] + margin[3])
    .attr("height", height + margin[0] + margin[2])
    .call(zoom);

var vis = svg.append("g")
    .attr("transform", "translate(" + margin[3] + "," + margin[0] + ")");

d3.json("arf.json")
  .then(function(json) {
    if (!json) return;

    root = d3.hierarchy(json);
    root.x0 = height / 2;
    root.y0 = 0;

    // Build the flat search index from the full hierarchy (before collapse).
    buildSearchIndex(root);
    setupFind();

    function collapse(d) {
      if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
      }
    }

    // Keep root + first level expanded, collapse grandchildren onward.
    root.children.forEach(function(child) {
      if (child.children) {
        child.children.forEach(function(grandchild) {
          collapse(grandchild);
        });
      }
    });

    update(root);
  })
  .catch(function(error) {
    console.error("Error loading arf.json:", error);
  });

function update(source) {
  // Compute the new tree layout.
  var treeData = tree(root);
  var nodes = treeData.descendants().reverse();

  // Normalize for fixed-depth.
  nodes.forEach(function(d) { d.y = d.depth * 180; });

  // Update the nodes…
  var node = vis.selectAll("g.node")
      .data(nodes, function(d) { return d.id || (d.id = ++i); });

  // Enter any new nodes at the parent's previous position.
  var nodeEnter = node.enter().append("g")
      .attr("class", function(d) {
        return d.children || d._children ? "node folder" : "node leaf";
      })
      .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
      .on("mouseover", function(event, d) {
        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", 12);
      })
      .on("mouseout", function(event, d) {
        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", 8);
      });

  nodeEnter.append("circle")
      .attr("r", 1e-6)
      .style("fill", function(d) { return nodeColor(d); })
      .style("stroke", function(d) { return nodeStroke(d); })
      .style("stroke-width", "2px")
      .on("click", onNodeClick);

  // Add text labels to nodes
  nodeEnter.append("text")
      .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
      .attr("dy", ".35em")
      .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
      .text(function(d) { return d.data.name; })
      .style("fill-opacity", 1e-6)
      .style("cursor", function(d) { return d.data.url ? "pointer" : (d.children || d._children ? "pointer" : "default"); })
      .on("click", onNodeClick);

  nodeEnter.append("title")
    .text(function(d) {
      return d.data.description;
    });

  // Transition nodes to their new position.
  var nodeUpdate = nodeEnter.merge(node);

  nodeUpdate.transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

  nodeUpdate.select("circle")
      .transition()
      .duration(duration)
      .attr("r", 8)
      .style("fill", function(d) {
        // Collapsed (has hidden children) reads darker; expanded / leaf lighter.
        return d._children ? nodeColor(d) : nodeColorLight(d);
      });

  nodeUpdate.select("text")
      .transition()
      .duration(duration)
      .style("fill-opacity", 1);

  // Transition exiting nodes to the parent's new position.
  var nodeExit = node.exit();

  nodeExit.transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
      .remove();

  nodeExit.select("circle")
      .transition()
      .duration(duration)
      .attr("r", 1e-6);

  nodeExit.select("text")
      .transition()
      .duration(duration)
      .style("fill-opacity", 1e-6);

  // Update the links…
  var link = vis.selectAll("path.link")
      .data(treeData.links(), function(d) { return d.target.id; });

  // Enter any new links at the parent's previous position.
  link.enter().insert("path", "g")
      .attr("class", "link")
      .attr("d", function(d) {
        var o = {x: source.x0, y: source.y0};
        return diagonal({source: o, target: o});
      })
    .transition()
      .duration(duration)
      .attr("d", diagonal);

  // Transition links to their new position.
  link.transition()
      .duration(duration)
      .attr("d", diagonal);

  // Transition exiting nodes to the parent's new position.
  link.exit().transition()
      .duration(duration)
      .attr("d", function(d) {
        var o = {x: source.x, y: source.y};
        return diagonal({source: o, target: o});
      })
      .remove();

  // Stash the old positions for transition.
  nodes.forEach(function(d) {
    d.x0 = d.x;
    d.y0 = d.y;
  });
}

// Open a leaf's URL, or toggle a folder's children.
function onNodeClick(event, d) {
  event.stopPropagation();
  if (d.data.url) {
    window.open(d.data.url, '_blank', 'noopener');
  } else if (d.children || d._children) {
    toggle(d);
    update(d);
  }
}

// Toggle children.
function toggle(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
}

/* =============================================================
   Find mode — search + tag facets over a flat leaf index.
   ============================================================= */

var KNOWN_TAGS = { G: 1, O: 1, R: 1, NA: 1, C: 1 };
var flatIndex = [];
var activeFacets = new Set();

// Remove parenthetical uppercase tokens — facet tags AND agency
// acronyms like (AOT)/(DOH) — from a display name.
function stripTags(name) {
  return name.replace(/\s*\([A-Z]+\)/g, '').trim();
}

// Keep only the recognized classification tags (ignore agency acronyms).
function parseTags(name) {
  var out = [], m, re = /\(([A-Z]+)\)/g;
  while ((m = re.exec(name))) {
    if (KNOWN_TAGS[m[1]] && out.indexOf(m[1]) === -1) out.push(m[1]);
  }
  return out;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function buildSearchIndex(rootNode) {
  rootNode.leaves().forEach(function(leaf) {
    if (!leaf.data.url) return;
    var category = '', subcategory = '';
    leaf.ancestors().forEach(function(a) {
      if (a.depth === 1) category = stripTags(a.data.name);
      if (a.depth === 2 && a !== leaf) subcategory = stripTags(a.data.name);
    });
    flatIndex.push({
      name: stripTags(leaf.data.name),
      url: leaf.data.url,
      description: leaf.data.description || '',
      category: category,
      subcategory: subcategory,
      tags: parseTags(leaf.data.name)
    });
  });
}

function setupFind() {
  var searchInput = document.getElementById('search');
  var clearBtn = document.getElementById('search-clear');
  var treePane = document.getElementById('body');
  var resultsPane = document.getElementById('results');
  var grid = document.getElementById('result-grid');
  var countEl = document.getElementById('results-count');
  var emptyEl = document.getElementById('results-empty');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.facet-chip'));

  if (!searchInput) return;

  searchInput.placeholder = 'Search ' + flatIndex.length + ' open-data sources…';

  function renderResults(matches) {
    countEl.innerHTML = '<strong>' + matches.length + '</strong> ' +
      (matches.length === 1 ? 'source' : 'sources') + ' found';
    emptyEl.hidden = matches.length !== 0;

    var frag = document.createDocumentFragment();
    matches.forEach(function(item) {
      var a = document.createElement('a');
      a.className = 'result-card';
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener';

      var crumb = item.category + (item.subcategory ? ' › ' + item.subcategory : '');
      var badges = item.tags.map(function(t) {
        return '<span class="badge badge--' + t.toLowerCase() + '">' + t + '</span>';
      }).join('');

      a.innerHTML =
        '<div class="result-card__head">' +
          '<h3 class="result-card__title">' + escapeHtml(item.name) + '</h3>' +
          '<span class="result-card__open" aria-hidden="true">↗</span>' +
        '</div>' +
        (crumb ? '<p class="result-card__crumb">' + escapeHtml(crumb) + '</p>' : '') +
        (item.description ? '<p class="result-card__desc">' + escapeHtml(item.description) + '</p>' : '') +
        (badges ? '<div class="result-card__tags">' + badges + '</div>' : '');

      frag.appendChild(a);
    });
    grid.innerHTML = '';
    grid.appendChild(frag);
  }

  function apply() {
    var q = searchInput.value.trim().toLowerCase();
    clearBtn.hidden = q.length === 0;

    var active = q.length > 0 || activeFacets.size > 0;
    if (!active) {
      resultsPane.hidden = true;
      treePane.hidden = false;
      return;
    }

    var matches = flatIndex.filter(function(item) {
      var textOk = !q ||
        item.name.toLowerCase().indexOf(q) !== -1 ||
        item.description.toLowerCase().indexOf(q) !== -1 ||
        item.category.toLowerCase().indexOf(q) !== -1 ||
        item.subcategory.toLowerCase().indexOf(q) !== -1;
      var facetOk = activeFacets.size === 0 ||
        item.tags.some(function(t) { return activeFacets.has(t); });
      return textOk && facetOk;
    });

    treePane.hidden = true;
    resultsPane.hidden = false;
    renderResults(matches);
  }

  function syncChips() {
    chips.forEach(function(c) {
      var f = c.dataset.facet;
      var on = f === 'all' ? activeFacets.size === 0 : activeFacets.has(f);
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  chips.forEach(function(chip) {
    chip.addEventListener('click', function() {
      var f = chip.dataset.facet;
      if (f === 'all') {
        activeFacets.clear();
      } else if (activeFacets.has(f)) {
        activeFacets.delete(f);
      } else {
        activeFacets.add(f);
      }
      syncChips();
      apply();
    });
  });

  var debounce;
  searchInput.addEventListener('input', function() {
    clearTimeout(debounce);
    debounce = setTimeout(apply, 150);
  });

  clearBtn.addEventListener('click', function() {
    searchInput.value = '';
    searchInput.focus();
    apply();
  });
}
