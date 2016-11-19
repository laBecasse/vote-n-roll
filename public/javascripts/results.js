
var displayScore = function(data){
  var margin = {top: 20, right: 20, bottom: 30, left: 40},
      width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var x0 = d3.scale.ordinal()
      .rangeRoundBands([0, width], .1);

  var x1 = d3.scale.ordinal();

  var y = d3.scale.linear()
      .range([height, 0]);

  var color = d3.scale.ordinal()
      .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

  var xAxis = d3.svg.axis()
      .scale(x0)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .tickFormat(d3.format(".2s"));

  var svg = d3.select("body").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

 
  

  var ageNames = d3.keys(data[0]).filter(function(key) { return key !== "category"; });
  
  data.forEach(function(d) {
    d.ages = ageNames.map(function(name) { return {name: name, value: +d[name]}; });
  });
  


  x0.domain(data.map(function(d) { return d.category; }));
  x1.domain(ageNames).rangeRoundBands([0, x0.rangeBand()]);
  y.domain([1+d3.max(data, function(d) { return d3.max(d.ages, function(d) { return d.value; }); }),1]);
  
    svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);
  
  // svg.append("g")
  //   .attr("class", "y axis")
  //   .call(yAxis)
  //   .append("text")
  //   .attr("transform", "rotate(-90)")
  //   .attr("y", 6)
  //   .attr("dy", ".71em")
  //   .style("text-anchor", "end")
  //   .text("Rang");
  
  var state = svg.selectAll(".state")
      .data(data)
      .enter().append("g")
      .attr("class", "state")
      .attr("transform", function(d) { return "translate(" + x0(d.category) + ",0)"; });
  
  state.selectAll("rect")
    .data(function(d) { return d.ages; })
    .enter().append("rect")
    .attr("width", x1.rangeBand())
    .attr("x", function(d) { return x1(d.name); })
    .attr("y", function(d) { return y(d.value); })
    .attr("height", function(d) { return height - y(d.value); })
    .style("fill", function(d) { return color(d.name); });
  
  var legend = svg.selectAll(".legend")
      .data(ageNames.slice().reverse())
      .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
  
  legend.append("rect")
    .attr("x", width - 18)
    .attr("width", 18)
    .attr("height", 18)
    .style("fill", color);
  
    legend.append("text")
    .attr("x", width - 24)
    .attr("y", 9)
    .attr("dy", ".35em")
    .style("text-anchor", "end")
    .text(function(d) { return d; });
  
}


/* Example of data
   var data2 = {
   times:[
   [
   {id:0,nodeName:"mit",nodeValue:10},
   {id:1,nodeName:"man",nodeValue:1},
   {id:2,nodeName:"jos",nodeValue:15}
   ],
   [
   {id:3,nodeName:"mit",nodeValue:11},
   {id:4,nodeName:"jos",nodeValue:15}
   ]
   ],
   links:[
   {source:0,target:3,value:10},
   {source:1,target:3,value:1},
   {source:2,target:4,value:15}
   ]
   }
*/
var displayMajority = function(data,title){
  /* Process Data */


  // make a node lookup map
  var nodeMap = (function() {
    var nm = {};
    data.times.forEach(function(nodes) {
      nodes.forEach(function(n) {
        nm[n.id] = n;
        // add links and assure node value
        n.links = [];
        n.incoming = [];
        n.nodeValue = n.nodeValue || 0;
      })
    });
    return nm;
  })();

  // attach links to nodes
  data.links.forEach(function(link) {
    nodeMap[link.source].links.push(link);
    nodeMap[link.target].incoming.push(link);
  });
  
  // sort by value and calculate offsets
  data.times.forEach(function(nodes) {
    var cumValue = 0;
    nodes.sort(function(a,b) {
        return d3.descending(a.nodeValue, b.nodeValue)
    });
    nodes.forEach(function(n, i) {
      n.order = i;
      n.offsetValue = cumValue;
      cumValue += n.nodeValue;
      // same for links
      var lCumValue;
      // outgoing
      if (n.links) {
        lCumValue = 0;
        n.links.sort(function(a,b) {
          return d3.descending(a.value, b.value)
        });
        n.links.forEach(function(l) {
          l.outOffset = lCumValue;
          lCumValue += l.value;
          l.color = n.color;
        });
      }
      // incoming
      if (n.incoming) {
        lCumValue = 0;
        n.incoming.sort(function(a,b) {
          return d3.descending(a.value, b.value)
        });
        n.incoming.forEach(function(l) {
          l.inOffset = lCumValue;
          lCumValue += l.value;
        });
      }
    })
  });
  data = data.times;

  // calculate maxes
  var maxn = d3.max(data, function(t) { return t.length }),
      maxv = d3.max(data, function(t) { return d3.sum(t, function(n) { return n.nodeValue }) });

  /* Make Vis */
  
  // settings and scales

  
  /*var win = window,
    doc = document,
    elt = doc.documentElement,
    body = doc.getElementsByTagName('body')[0],
    width = win.innerWidth || elt.clientWidth || body.clientWidth,
    height = win.innerHeight|| elt.clientHeight|| body.clientHeight;
  */
  
  var margin = {top: 30, right: 20, bottom:30, left:20},
      w = 1000 - margin.right - margin.left,
      h = 500 - margin.bottom - margin.top,
      gapratio = .7, //proportion de flux
      delay = 0,
      padding = 15, //distance vertical entre les candidat
      x = d3.scale.ordinal()
      .domain(d3.range(data.length))
      .rangeBands([0, w + (w/(data.length-1))], gapratio),
      y = d3.scale.linear()
      .domain([0, maxv])
      .range([0, h - padding * maxn]),
      line = d3.svg.line()
      .interpolate('basis');
  
  // root
  var svg = d3.select("body")
      .append("svg:svg")
      .attr("width", w + margin.left + margin.right)
      .attr("height",h + margin.top + margin.bottom);
  

  //title
  svg.append("text")
    .attr("x",(w/2))
    .attr("y", margin.top/2)
    .attr("text-anchor","middle")
    .style("font-size","15px")
    .text(title);
  
  var vis = svg.append("g")
      .attr("transform","translate("+margin.left + "," + margin.top +")");
  

  
  var t = 0;
  function update(first) {
    // update data
    var currentData = data.slice(0, ++t);
    
    // time slots
    var times = vis.selectAll('g.time')
        .data(currentData)
        .enter().append('svg:g')
        .attr('class', 'time')
        .attr("transform", function(d, i) { return "translate(" + (x(i) - x(0)) + ",0)" });
    
    // node bars
    var nodes = times.selectAll('g.node')
        .data(function(d) { return d })
        .enter().append('svg:g')
        .attr('class', 'node');
    
    setTimeout(function() {

      nodes.append('svg:title')
        .text(function(n) { return n.nodeName })
      
      nodes.append('svg:rect')
        .attr('y', function(n, i) {
          return y(n.offsetValue) + i * padding;
        })
        .attr('width', x.rangeBand())
        .attr('height', function(n) { return y(n.nodeValue) })
        .attr('fill',function(n){ return n.color });

      nodes
        .append("svg:image")
        .attr('y', function(n, i) {
          return y(n.offsetValue) + i * padding;
        })
        .attr('width', function(n) { return Math.min(x.rangeBand(),y(n.nodeValue))})
        .attr('height', function(n) { return Math.min(x.rangeBand(),y(n.nodeValue))})
        .attr("transform", function(n){
          var dx = (x.rangeBand() - Math.min(x.rangeBand(),y(n.nodeValue)))/2,
              dy = ( y(n.nodeValue) - Math.min( x.rangeBand() , y(n.nodeValue) ))/2;

          return "translate("+dx+","+dy+")";
        })
        .attr('xlink:href',function(n) {return n.image;})
      
    }, (first ? 0 : delay));
    
    var linkLine = function(start) {
      return function(l) {
        var source = nodeMap[l.source],
            target = nodeMap[l.target],
            gapWidth = x(0),
            bandWidth = x.rangeBand() + gapWidth,
            startx = x.rangeBand() - bandWidth,
            sourcey = y(source.offsetValue) + 
            source.order * padding +
            y(l.outOffset) +
            y(l.value)/2,
            targety = y(target.offsetValue) + 
            target.order * padding + 
            y(l.inOffset) +
            y(l.value)/2,
            points = start ? 
            [
              [ startx, sourcey ], [ startx, sourcey ], [ startx, sourcey ], [ startx, sourcey ] 
            ] :
            [
              [ startx, sourcey ],
              [ startx + gapWidth/2, sourcey ],
              [ startx + gapWidth/2, targety ],
              [ 0, targety ]
            ];
        return line(points);
      }
    }
    
    // links
    var links = nodes.selectAll('path.link')
        .data(function(n) {console.log(n); return n.incoming || [] })
        .enter().append('svg:path')
        .attr('class', 'link')
        .style('stroke-width', function(l) { return y(l.value) })
        .style('stroke',function(l){ return l.color})
        .attr('d', linkLine(true))
        .on('mouseover', function() {
          d3.select(this).attr('class', 'link on')
        })
        .on('mouseout', function() {
          d3.select(this).attr('class', 'link')
        })
        .transition()
        .duration(delay)
        .attr('d', linkLine());
    
  }

  function updateNext() {
    if (t < data.length) {
      update();
      window.setTimeout(updateNext, delay)
    }
  }
  update(true);
  updateNext();
  
};
