var width = parseFloat(document.getElementById('graph-container').offsetWidth);
var height = parseFloat(document.getElementById('graph-container').offsetHeight);

var loading = d3.select('#graph-container').append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("dy", ".35em")
    .style("text-anchor", "middle")
    .text("Simulating. One moment please…");

var minNodeSize = 5;
var maxNodeSize = 10;
var minEdgeSize = 0.1;
var maxEdgeSize = 1;

sigma.parsers.json('giantComponent.json', {

          container: 'graph',

          settings: {

          	// autoResize: false,
          	autoRescale: ['nodePosition', 'edgeSize'],

          	minNodeSize: minNodeSize,
          	maxNodeSize: maxNodeSize,
          	minEdgeSize: minEdgeSize,
          	maxEdgeSize: maxEdgeSize,

          	nodeColor: 'default',
		    defaultNodeColor: '#ff0000',
		    defaultNodeType: 'def',
		    edgeColor: 'default',
		    defaultEdgeColor: '#ffff00',
		    enableEdgeHovering: true
		  },

		  renderer: {
		  	container: document.getElementById('graph'),
    		type: 'canvas'
		  }

		  
		}
		);

setTimeout(function () {
	loading.remove();
	nodeStyling();
	edgeStyling();
	interactiveNodes();
	highlight();
},1000)

function nodeStyling () {
	var s = sigma.instances()[0];
	var nodes = s.graph.nodes();
	//Create color scale with D3
	var minProj = d3.min(nodes, function(d) { return d.numProj; });
	var maxProj = d3.max(nodes, function(d) { return d.numProj; });
	nodeColorScale = d3.scaleLog()
				.domain([minProj, maxProj])
				.range(["rgb(168,221,181)", "rgb(78,179,211)"]);
	//Style nodes with sigma
	nodes.forEach(function (n) {
		n.size= maxNodeSize/2;
		n.color=nodeColorScale(n.numProj);
	})
	s.refresh();
}

function edgeStyling () {
	var s = sigma.instances()[0];
	var edges = s.graph.edges();
	//Create color scale with D3
	var minCollab = d3.min(edges, function(d) { return d.collaborations; });
	var maxCollab = d3.max(edges, function(d) { return d.collaborations; });
	edgeColorScale = d3.scaleLog()
				.domain([minCollab, maxCollab])
				.range(["rgba(168,221,181,0.5)", "rgba(78,179,211,1.0)"]);
	edgeSizeScale = d3.scaleLog()
				.domain([minCollab, maxCollab])
				.range([minEdgeSize, maxEdgeSize/2]);
	//Style nodes with sigma
	edges.forEach(function (e) {
		e.color=edgeColorScale(e.collaborations);
		e.size=edgeSizeScale(e.collaborations);
	})
	s.refresh();
}

// Configure the noverlap layout:
function noOverlap () {
var s = sigma.instances()[0];
var noverlapListener = s.configNoverlap({
  nodeMargin: 0.2,
  scaleNodes: 1,
  gridSize: 100,
  easing: 'quadraticInOut', // animation transition function
  duration: 500   // animation duration. Long here for the purposes of this example only
});
// Bind the events:
noverlapListener.bind('start stop interpolate', function(e) {
  console.log(e.type);
  if(e.type === 'start') {
    console.time('noverlap');
  }
  if(e.type === 'interpolate') {
    console.timeEnd('noverlap');
  }
});
// Start the layout:
s.startNoverlap();
}

// Add a method to the graph model that returns an
// object with every neighbors of a node inside:
sigma.classes.graph.addMethod('neighbors', function(nodeId) {
	var k,
	    neighbors = {},
	    index = this.allNeighborsIndex[nodeId] || {};

	for (k in index)
	  neighbors[k] = this.nodesIndex[k];

	return neighbors;
});

function interactiveNodes () {	
	var s = sigma.instances()[0];
	var nodes = s.graph.nodes();
	//Drag nodes
	//var dragListener = sigma.plugins.dragNodes(s, s.renderers[0]);
	s.bind('overNode', function (d) {
		//Change node size (too laggy)
		// d.data.node.size = maxNodeSize;
		// s.refresh();
		//Change cursor
		d3.select('#graph')
		.style('cursor', 'default')
		//Display tooltip
		d3.select('#tooltip')
		.classed('invisible', false)
		//Add text
		d3.select('#tooltip')
		.append('p')
		.text(d.data.node.name + ' (' + d.data.node.country + ') participated in ' + d.data.node.numProj + ' projects with ' + d.data.node.collaborators + ' collaborators.')
		.append('p')
		.text('It intermediated ' + d.data.node.dependentOrgs + ' organizations.');
	})

	s.bind('outNode', function (d) {
		//Change node size back to normal
		// d.data.node.size = maxNodeSize/2;
		// s.refresh();
		//Change cursor back
		d3.select('#graph')
		.style('cursor', 'grab')
		//Remove text
		setTimeout(function () {
			d3.select('#tooltip')
			.selectAll('p')
			.remove();
			},1000)
			//Hide tooltip
			d3.select('#tooltip')
			.classed('invisible', true)

	})
}

function highlight () {
	var s = sigma.instances()[0];
	var nodes = s.graph.nodes();
	var edges = s.graph.edges();
	var maxCollab = d3.max(edges, function(d) { return d.collaborations; });

	// We first need to save the original colors of our
	// nodes and edges, like this:
	nodes.forEach(function(n) {
	    n.originalColor = n.color;
	    n.originalSize = n.size;
	  });
	edges.forEach(function(e) {
	    e.originalColor = e.color;
	    e.originalSize = e.size;
	  });

	// When a node is clicked, we check for each node
	// if it is a neighbor of the clicked one. If not,
	// we set its color as grey, and else, it takes its
	// original color.
	// We do the same for the edges, and we only keep
	// edges that have both extremities colored.
	s.bind('clickNode', function(e) {
	    var nodeId = e.data.node.id,
	        toKeep = s.graph.neighbors(nodeId);
	    toKeep[nodeId] = e.data.node;

		nodes.forEach(function(n) {
	      if (toKeep[n.id])
	        n.color = n.originalColor;
	      else
	        //n.color = 'rgba(0,0,0,0)';
	    	n.hidden = true;
	    });

	    edges.forEach(function(e) {
	      if (toKeep[e.source] && toKeep[e.target]) {
	        e.color = e.originalColor;
	    	e.size = maxEdgeSize; }
	      else
	        //e.color = 'rgba(0,0,0,0)';
	    	e.hidden = true;
	    });

	    // Since the data has been modified, we need to
	    // call the refresh method to make the colors
	    // update effective.
	    s.refresh();

	    interactiveEdges();
	    //Change navigation
        d3.select('.click01').classed('hidden', true);
        d3.select('.click02').classed('hidden', false);
	});

	// When the stage is clicked, we just color each
	// node and edge with its original color.
	s.bind('clickStage', function(e) {
	    nodes.forEach(function(n) {
	      n.color = n.originalColor;
	      n.hidden = false;
	    });

	    edges.forEach(function(e) {
	      e.color = e.originalColor;
	      e.size = e.originalSize;
	      e.hidden = false;
	    });

	    // Same as in the previous event:
	    s.refresh();

	    //Change navigation
	    d3.select('.click01').classed('hidden', false);
        d3.select('.click02').classed('hidden', true);
	});
 }

  function interactiveEdges () {
  	var s = sigma.instances()[0];
	var edges = s.graph.edges();

	edges.forEach(function(e) {
	    e.originalColor = e.color;
	    e.originalSize = e.size;
	  });

	// s.bind('overEdge', function (d) {
	// 	//Change node size (too laggy)
	// 	// d.data.node.size = maxNodeSize;
	// 	// s.refresh();
	// 	//Display tooltip
	// 	d3.select('#tooltip')
	// 	.classed('invisible', false)
	// 	//Add text
	// 	d3.select('#tooltip')
	// 		.append('p')
	// 		.text(d.data.edge.source + ' and ' + d.data.edge.source + ' worked toherther on ' + d.data.edge.collaborations + ' projects.')
	// 		.append('p')
	// 		.text('The total budget of their colabroations amounts to €' + commafy(d.data.edge.collBudget) + '.');
	// })

	// 	s.bind('outEdge', function (d) {
	// 	//Change node size back to normal
	// 	// d.data.node.size = maxNodeSize/2;
	// 	// s.refresh();
	// 	//Remove text
	// 	d3.select('#tooltip')
	// 	.selectAll('p')
	// 	.remove();
	// 	//Hide tooltip
	// 	d3.select('#tooltip')
	// 	.classed('invisible', true)
	// })
}

//Add commas every three digits (tooltip)
function commafy( num ) {
    var str = num.toString().split('.');
    if (str[0].length >= 5) {
        str[0] = str[0].replace(/(\d)(?=(\d{3})+$)/g, "$1'");
    }
    if (str[1] && str[1].length >= 5) {
        str[1] = str[1].replace(/(\d{3})/g, '$1 ');
    }
    return str.join('.');
    }

setTimeout(function(){
    document.body.className="";
},500);