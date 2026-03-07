console.log("=== ARF.JS STARTED ===");
console.log("Window dimensions:", window.innerWidth, "x", window.innerHeight);

// Add debug display to page
function addDebugMessage(msg, isError) {
  var debugDiv = document.getElementById('debug-output');
  if (!debugDiv) {
    debugDiv = document.createElement('div');
    debugDiv.id = 'debug-output';
    debugDiv.style.cssText = 'position:fixed;top:80px;left:10px;background:' + (isError ? '#dc2626' : '#059669') + ';color:white;padding:10px;border-radius:5px;font-family:monospace;font-size:12px;max-width:400px;z-index:9999;';
    document.body.appendChild(debugDiv);
  }
  debugDiv.innerHTML += msg + '<br>';
  console.log(msg);
}

addDebugMessage('✓ ARF.JS loaded');
addDebugMessage('Window: ' + window.innerWidth + 'x' + window.innerHeight);

var margin = [20, 60, 20, 60],
    width = window.innerWidth - margin[1] - margin[3],
    height = window.innerHeight * 0.9 - margin[0] - margin[2],
    i = 0,
    duration = 1250,
    root;

console.log("Calculated dimensions - width:", width, "height:", height);
console.log("Margins:", margin);
addDebugMessage('SVG size: ' + width + 'x' + height);

console.log("Creating D3 tree layout...");
var tree = d3.tree()
    .size([height, width]);
console.log("Tree layout created:", tree);

var diagonal = d3.linkHorizontal()
    .x(d => d.y)
    .y(d => d.x);

// Color function based on depth
function nodeColor(d) {
  if (d.depth === 0) return "#4338ca"; // deep indigo for root
  if (d.depth === 1) return "#0d9488"; // teal for categories
  if (d.depth === 2) return "#ea580c"; // coral/orange for sub-categories
  return "#059669"; // emerald for leaves
}

function nodeStroke(d) {
  if (d.depth === 0) return "#6366f1";
  if (d.depth === 1) return "#14b8a6";
  if (d.depth === 2) return "#f97316";
  return "#10b981";
}

// Create SVG with zoom behavior
var zoom = d3.zoom()
    .scaleExtent([0.3, 3])
    .on("zoom", (event) => {
      vis.attr("transform", event.transform);
    });

console.log("Selecting #body element...");
var bodyElement = d3.select("#body");
console.log("Body element found:", bodyElement.node());

console.log("Creating SVG element...");
var svg = bodyElement.append("svg")
    .attr("width", width + margin[1] + margin[3])
    .attr("height", height + margin[0] + margin[2])
    .call(zoom);
console.log("SVG created:", svg.node());
addDebugMessage('✓ SVG element created');

// Add drop shadow filter
var defs = svg.append("defs");
var filter = defs.append("filter")
    .attr("id", "drop-shadow")
    .attr("height", "130%");

filter.append("feGaussianBlur")
    .attr("in", "SourceAlpha")
    .attr("stdDeviation", 3);

filter.append("feOffset")
    .attr("dx", 0)
    .attr("dy", 2)
    .attr("result", "offsetblur");

var feMerge = filter.append("feMerge");
feMerge.append("feMergeNode");
feMerge.append("feMergeNode")
    .attr("in", "SourceGraphic");

var vis = svg.append("g")
    .attr("transform", "translate(" + margin[3] + "," + margin[0] + ")");

console.log("Loading arf.json...");
addDebugMessage('Loading arf.json...');
d3.json("arf.json")
  .then(function(json) {
    console.log("d3.json Promise resolved!");
    console.log("JSON data:", json);
    addDebugMessage('d3.json loaded successfully!');

    if (!json) {
      console.error("JSON is null or undefined");
      addDebugMessage('❌ JSON is null!', true);
      return;
    }

    console.log("JSON loaded successfully!");
    console.log("Root has children:", json.children ? json.children.length : "NO CHILDREN");
    addDebugMessage('✓ JSON loaded: ' + (json.children ? json.children.length + ' categories' : 'NO CHILDREN'));

    root = d3.hierarchy(json);
  root.x0 = height / 2;
  root.y0 = 0;

  function collapse(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
    }
  }

  // Collapse from level 2 onwards (keep root and first level expanded)
  function collapseFromLevel(d, currentDepth, targetDepth) {
    if (d.children) {
      if (currentDepth >= targetDepth) {
        d._children = d.children;
        d._children.forEach(function(child) {
          collapseFromLevel(child, currentDepth + 1, targetDepth);
        });
        d.children = null;
      } else {
        d.children.forEach(function(child) {
          collapseFromLevel(child, currentDepth + 1, targetDepth);
        });
      }
    }
  }

  // Collapse all children recursively except the first level
  function collapseDeep(d) {
    if (d.children) {
      d.children.forEach(collapseDeep);
      if (d.depth && d.depth >= 1) {
        d._children = d.children;
        d.children = null;
      }
    }
  }

  // First, let D3 calculate depths by calling update which calls tree.nodes(root)
  // Then collapse based on calculated depths
  // For now, keep first level expanded (collapse depth >= 2)
  console.log("Collapsing grandchildren...");
  root.children.forEach(function(child) {
    console.log("Processing child:", child.data.name);
    if (child.children) {
      console.log("  Child has", child.children.length, "children");
      child.children.forEach(function(grandchild) {
        collapse(grandchild);
      });
    }
  });

  console.log("Calling update(root)...");
  addDebugMessage('Calling update()...');
  update(root);
  console.log("update(root) completed!");
  addDebugMessage('✓ Rendering complete!');
})
.catch(function(error) {
  console.error("Error loading arf.json:", error);
  addDebugMessage('❌ ERROR loading JSON: ' + error, true);
});

function update(source) {
  console.log("=== UPDATE FUNCTION CALLED ===");
  console.log("Source:", source);
  console.log("Root:", root);

  // Compute the new tree layout.
  console.log("Computing tree(root)...");
  var treeData = tree(root);
  var nodes = treeData.descendants().reverse();
  console.log("Nodes computed:", nodes.length, "nodes");
  addDebugMessage('Computing ' + nodes.length + ' nodes...');

  // Normalize for fixed-depth.
  nodes.forEach(function(d) { d.y = d.depth * 180; });

  // Update the nodes…
  console.log("Selecting existing nodes...");
  var node = vis.selectAll("g.node")
      .data(nodes, function(d) { return d.id || (d.id = ++i); });
  console.log("Node selection created with", nodes.length, "data items");

  // Enter any new nodes at the parent's previous position.
  console.log("Creating new nodes...");
  var nodeEnter = node.enter().append("g")
      .attr("class", function(d) {
        return d.children || d._children ? "node folder" : "node leaf";
      })
      .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
      .on("mouseover", function(d) {
        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", 12);
      })
      .on("mouseout", function(d) {
        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", 8);
      });

  // D3 v7: selections have .size() method
  var newNodeCount = nodeEnter.size();
  console.log("NodeEnter selection:", newNodeCount, "new nodes to create");
  addDebugMessage('✓ Creating ' + newNodeCount + ' new nodes');

  nodeEnter.append("circle")
      .attr("r", 1e-6)
      .style("fill", function(d) {
        return d._children ? nodeColor(d) : nodeColor(d);
      })
      .style("stroke", function(d) { return nodeStroke(d); })
      .style("stroke-width", "2px")
      .style("filter", "url(#drop-shadow)")
      .on("click", function(event, d) {
        // Only toggle if it's a folder node (has children or _children)
        if (d.children || d._children) {
          event.stopPropagation();
          toggle(d);
          update(d);
        }
      });

  // Add text labels to nodes
  nodeEnter.append("text")
      .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
      .attr("dy", ".35em")
      .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
      .text(function(d) { return d.data.name; })
      .style("fill", "#e2e8f0")
      .style("font-size", "13px")
      .style("font-weight", "500")
      .style("fill-opacity", 1e-6)
      .style("cursor", function(d) { return d.data.url ? "pointer" : (d.children || d._children ? "pointer" : "default"); });

  nodeEnter.append("title")
    .text(function(d) {
      return d.data.description;
    });

  // Transition nodes to their new position.
  var nodeUpdate = node.transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

  nodeUpdate.select("circle")
      .attr("r", 8)
      .style("fill", function(d) {
        if (d._children) {
          // Has collapsed children - darker shade
          var baseColor = nodeColor(d);
          return baseColor;
        } else {
          // Expanded or leaf - lighter shade
          if (d.depth === 0) return "#6366f1";
          if (d.depth === 1) return "#14b8a6";
          if (d.depth === 2) return "#fb923c";
          return "#34d399";
        }
      });

  nodeUpdate.select("text")
      .style("fill-opacity", 1);

  // Transition exiting nodes to the parent's new position.
  var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
      .remove();

  nodeExit.select("circle")
      .attr("r", 1e-6);

  nodeExit.select("text")
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
