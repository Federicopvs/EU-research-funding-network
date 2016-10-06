var width = parseFloat(document.getElementById('graph-container').offsetWidth);
var height = parseFloat(document.getElementById('graph-container').offsetHeight);

var dataset;

var minNodeSize = 5;
var maxNodeSize = 10;
var minEdgeSize = 0.1;
var maxEdgeSize = 1;

wait();

sigma.parsers.json('giantComponent.json', {

          container: 'graph',

          settings: {

          	// autoResize: false,
          	autoRescale: ['nodePosition', 'edgeSize'],

          	minNodeSize: minNodeSize,
          	maxNodeSize: maxNodeSize/2,
          	minEdgeSize: minEdgeSize,
          	maxEdgeSize: maxEdgeSize/2,

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
	});

setTimeout(function () {
	nodeStyling();
	edgeStyling();
	interactiveNodes();
	highlight();
	githubLink();
	switchFocus();
	waitOver();
}, 1000)

function wait() {
	d3.select('body').style('cursor', 'wait');
}

function waitOver () {
	d3.select('body').style('cursor', 'default');
}

function nodeStyling () {
	var s = sigma.instances()[0];
	var nodes = s.graph.nodes();
	//Create color scale with D3
	var minProj = d3.min(nodes, function(d) { return d.numProj; });
	var maxProj = d3.max(nodes, function(d) { return d.numProj; });

	nodeColorScale = d3.scaleLog()
			.domain([minProj, maxProj])
			.range(["rgb(204,235,197)", "rgb(8,104,172)"]);
	//Old scale
	// nodeColorScale = d3.scaleLog()
	// 			.domain([minProj, maxProj])
	// 			.range(["rgb(168,221,181)", "rgb(78,179,211)"]);

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
				.range(["rgb(204,235,197)", "rgb(8,104,172)"]);
				// .range(["rgba(204,235,197,0.5)", "rgb(8,104,172,1.0)"]);
	edgeSizeScale = d3.scaleLog()
				.domain([minCollab, maxCollab])
				.range([maxEdgeSize/2, minEdgeSize]);
	//Style nodes with sigma
	edges.forEach(function (e) {
		e.color=edgeColorScale(e.collaborations);
		// e.size= edgeSizeScale(e.collaborations);
		e.size = maxEdgeSize;
	})
	s.refresh();
}

// // Configure the noverlap layout:
// function noOverlap () {
// var s = sigma.instances()[0];
// var noverlapListener = s.configNoverlap({
//   nodeMargin: 0.2,
//   scaleNodes: 1,
//   gridSize: 100,
//   easing: 'quadraticInOut', // animation transition function
//   duration: 500   // animation duration. Long here for the purposes of this example only
// });
// // Bind the events:
// noverlapListener.bind('start stop interpolate', function(e) {
//   console.log(e.type);
//   if(e.type === 'start') {
//     console.time('noverlap');
//   }
//   if(e.type === 'interpolate') {
//     console.timeEnd('noverlap');
//   }
// });
// // Start the layout:
// s.startNoverlap();
// }

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

		//Make edges unresponsive
		s.settings('enableEdgeHovering', false)

		//Change cursor
		d3.select('#graph')
		.style('cursor', 'pointer')
		//.style('cursor: -webkit-', 'pointer')
		//Display tooltip
		d3.select('#tooltipNode')
		.classed('invisible', false)
		//Add text
		d3.select('#tooltipNode')
		.html('<p><strong>' + toTitleCase(d.data.node.name) + '</strong> participated in <strong>' + d.data.node.numProj + '</strong> projects with <strong>' + d.data.node.collaborators + '</strong> collaborators.</p><p>It intermediated <strong>' + d.data.node.dependentOrgs + '</strong> organizations.</p>')
	})

	s.bind('outNode', function (d) {
		//Change node size back to normal
		// d.data.node.size = maxNodeSize/2;
		// s.refresh();
		//Change cursor back
		d3.select('#graph')
		.style('cursor', 'grab')
		.style('cursor', '-webkit-grab')

		//Make edges unresponsive
		s.settings('enableEdgeHovering', true)

		//Hide tooltip
		d3.select('#tooltipNode')
		.classed('invisible', true)
		//Remove text
		d3.select('#tooltipNode')
		.selectAll('p')
		.remove();
	})
}

var highlighted = 0;

function switchFocus () {
	var s = sigma.instances()[0];
	var nodes = s.graph.nodes();
	var edges = s.graph.edges();
	
	var deathStarToggle = 0;
	
	d3.select("#deathStarTrigger").on('click', function () {
		//Wait cursor
		wait();
		if (deathStarToggle==0) {
			//Generate new graph
			sigma.parsers.json(
		  	'deathStar.json',
		  	s,
		  	function() {
		    	s.refresh();
		  		})

			//Style new graph
			setTimeout(function () {
				nodeStyling();
				edgeStyling();
				interactiveNodes();
				highlight();
				//Set zoom level
				s.cameras[0].goTo({ x: 0, y: 0, angle: 0, ratio: 2.5 });
				//Change cursor
				waitOver();
				//Change button
				d3.select('.buttonSmall').html('Back to<br>');
				d3.select('.buttonBig').html('Giant Component');
				//Reset navigation
		    	d3.selectAll('.click01').classed('hidden', false);
	        	d3.selectAll('.click02').classed('hidden', true);
	        	//Deactivate edge hovering
	        	s.unbind('overEdge')
				s.unbind('outEdge')
				s.refresh();
			}, 1000)
			//Change toggle
			deathStarToggle = 1;

		} else {
			//Generate new graph
			sigma.parsers.json(
		  	'giantComponent.json',
		  	s,
		  	function() {
		    	s.refresh();
		  		})
			//Style new graph
			setTimeout(function () {
				nodeStyling();
				edgeStyling();
				interactiveNodes();
				highlight();
				//Change cursor
				waitOver();
				//Set zoom level
				s.cameras[0].goTo({ x: 0, y: 0, angle: 0, ratio: 1 });
				//Change button
				d3.select('.buttonSmall').html('Zoom into<br>');
				d3.select('.buttonBig').html('Death Star');
				//Reset navigation
		    	d3.selectAll('.click01').classed('hidden', false);
	        	d3.selectAll('.click02').classed('hidden', true);
	        	//Deactivate edge hovering
	        	s.unbind('overEdge')
				s.unbind('outEdge')
				s.refresh();
			}, 1000)
			//Change toggle
			deathStarToggle = 0;
		}
	});
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
	// we set it invisible, and else, it takes its
	// original color.
	// We do the same for the edges, and we only keep
	// edges that have both extremities colored.
	s.bind('clickNode', function(e) {
		highlighted = 1;
	    var nodeId = e.data.node.id,
	        toKeep = s.graph.neighbors(nodeId);
	    toKeep[nodeId] = e.data.node;

		nodes.forEach(function(n) {
			//Firstly display previously hidden nodes
			n.hidden = false;
	      if (toKeep[n.id]) {
	        n.color = n.originalColor;
	    	// n.size = maxNodeSize;
	      } else {
	        //n.color = 'rgba(0,0,0,0)';
	    	n.hidden = true;
	    	}
	    });

	    edges.forEach(function(e) {
	    	//Firstly display previously hidden nodes
	    	e.hidden = false;
	      if (toKeep[e.source] && toKeep[e.target]) {
	        e.color = e.originalColor;
	    	// e.size = maxEdgeSize; 
	    }
	      else
	        //e.color = 'rgba(0,0,0,0)';
	    	e.hidden = true;
	    });

	    // Since the data has been modified, we need to
	    // call the refresh method to make the colors
	    // update effective.
	    s.refresh();

	    //Make edges responsive
	    s.bind('overEdge', function (d) {
			//Display tooltip
			d3.select('#tooltipEdge')
			.classed('invisible', false)
			//Change cursor
			d3.select('#graph')
			.style('cursor', 'pointer')
			//.style('cursor: -webkit-', 'pointer');
			//Add text
			d3.select('#tooltipEdge')
			.html('<p><strong>' + toTitleCase(d.data.edge.sourceName) + '</strong> and <strong>' + toTitleCase(d.data.edge.targetName) + '</strong> worked together on <strong>' + d.data.edge.collaborations + '</strong> projects.</p><p>The total budget of their collaborations amounts to <strong>€ ' + commafy(d.data.edge.collBudget) + '.</p>');
		})
			s.bind('outEdge', function (d) {
			//Change node size back to normal
			// d.data.node.size = maxNodeSize/2;
			// s.refresh();
			//Change cursor
			d3.select('#graph')
			.style('cursor', 'grab')
			.style('cursor', '-webkit-grab');
			//Remove text
			d3.select('#tooltipEdge')
			.selectAll('p')
			.remove();
			//Hide tooltip
			d3.select('#tooltipEdge')
			.classed('invisible', true)
		})

	    //Change navigation
        d3.selectAll('.click01').classed('hidden', true);
        d3.selectAll('.click02').classed('hidden', false);
	});

	// When the stage is clicked, we just color each
	// node and edge with its original color.
	s.bind('clickStage', function(e) {
		highlighted = 0;
	    nodes.forEach(function(n) {
	      n.color = n.originalColor;
	      n.size = n.originalSize;
	      n.hidden = false;
	    });

	    edges.forEach(function(e) {
	      e.color = e.originalColor;
	      e.size = e.originalSize;
	      e.hidden = false;
	    });

	    //Make edges unresponsive
	    s.unbind('overEdge')
		s.unbind('outEdge')

	    // Same as in the previous event:
	    s.refresh();

	    //Change navigation
	    d3.selectAll('.click01').classed('hidden', false);
        d3.selectAll('.click02').classed('hidden', true);
	});
 }

//Convert names to title case
function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
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

function selectList () {
	d3.json('giantComponent.json', function (error, data) {
		if (error) throw error;

	console.log(data);
	dataset = data;

	var select = d3.select("body")
      .append("div")
      .append("select")

    select.selectAll("option")
      .data(dataset.nodes)
      .enter()
      .append("option")
      .attr("value", function (d) { return d.id; })
      .text(function (d) { return d.name + ' (' + d.country + ')'; })
      .sort(function (d) { return d.name});

	})
}


//Change githubLogo on mouseover
function githubLink () {
d3.select('#githubLink').on('mouseover', function (){
d3.select('#githubLink').attr('src', 'icons/github_mark_inv.png');})

d3.select('#githubLink').on('mouseout', function (){
d3.select('#githubLink').attr('src', 'icons/github_mark.png');})
}