var rawData, nestedData, peopleData;

var keyDates = [
	{"date": "11:59 PM 3/27/17", "label": "P2S1 due"},
	{"date": "11:59 PM 3/31/17", "label": "P2S2 due"},
	{"date": "11:59 PM 4/1/17", "label": "Spring Break Starts"},
	{"date": "11:59 PM 4/9/17", "label": "Spring Break Ends"},
	{"date": "11:59 PM 4/14/17", "label": "P2S3 due"},
	{"date": "11:59 PM 4/20/17", "label": "P2 due"},

	{"date": "4:45 PM 3/23/17", "label": "Meeting"},
	{"date": "4:45 PM 3/30/17", "label": "Meeting"},
	{"date": "12:05 PM 4/10/17", "label": "Meeting"},
	{"date": "2:00 PM 4/15/17", "label": "Meeting"},
	{"date": "11:30 AM 4/20/17", "label": "Meeting"},
];

d3.tsv("data/texts.txt", parseLine, function(data) {
	rawData = data;
	msgTimeGraph();
})	

function parseLine(row) {
	return {"date":new Date(row.Date), "name":row.Name, "msg":row.Msg};
}

function msgTimeGraph() {
	var svg = d3.select("#time"),
    margin = {top: 60, right: 20, bottom: 30, left: 50},
    width = +svg.attr("width") - margin.left - margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom,
    g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	nestedData = d3.nest()
	.key(function(d) {
		var tempDate = d.date;
		tempDate.setMinutes(0);
		tempDate.setSeconds(0);
		return new Date(tempDate);
	})
	.rollup(function(v) { return v.length; })
	.entries(rawData);

	nestedData = nestedData.filter(function(d) { return d.key != "Invalid Date"; });
	var dates = nestedData.map(function(d) { return d.key; });

	var x = d3.scaleTime()
	.rangeRound([0, width])
	.domain([new Date("3/22/17"), new Date("4/21/17")]);

	var y = d3.scaleLinear()
	.rangeRound([height, 0])
	.domain([0, 40]);

	g.append("g")
	.attr("transform", "translate(0," + height + ")")
	.call(d3.axisBottom(x));

	g.append("g")
	.call(d3.axisLeft(y))
	.append("text")
	.attr("fill", "#000")
	.attr("transform", "rotate(-90)")
	.attr("y", 6)
	.attr("dy", "0.71em")
	.attr("text-anchor", "end")
	.text("# Texts");

	keyDates.forEach(function(d) {
		var color;
		d.label == "Meeting" ? color = "lightblue" : color = "#d8d8d8";

		g.append("path")
		.attr("stroke", color)
		.attr("d", "M" + x(new Date(d.date)) + " " + y(0) + "L" + x(new Date(d.date)) + " " + y(40) + "z");

		g.append("text").text(d.label)
		.attr("transform", "translate(" + (x(new Date(d.date)) - 5) + ", 50),rotate(-90)")
		.attr("text-anchor", "end")
		.attr("font-size", 12)
		.attr("fill", color);
	});

	var timeFormat = d3.timeFormat("%I %p %A, %B %d, %Y");
	var tooltip = false;

	// Append histogram bars

	g.selectAll(".bars").data(nestedData).enter().append("path")
	.attr("d", function (d) {
		return "M" + x(new Date(d.key)) + " " + height 
		+ "L" + x(new Date(d.key)) + " " + y(d.value)
	})
	.attr("stroke-width", 6)
	.attr("stroke", "#999")
	.on("mouseover", function(d) { 
		if (!tooltip) {
			var date = new Date(d.key);
			tooltip = g.append("g");
			tooltip.append("rect")
			.attr("width", 200)
			.attr("height", 30)
			.attr("pointer-events", "none")
			.attr("opacity", 0.8);

			tooltip.append("text")
			.text(timeFormat(date) + ": " + d.value + " text(s)")
			.attr("fill", "#fff")
			.attr("font-size", 10)
			.attr("font-family", "sans-serif")
			.attr("transform", "translate(100,20)")
			.attr("dominant-baseline", "center")
			.attr("text-anchor", "middle")
			.attr("pointer-events", "none");
		}

		d3.select(this).attr("stroke", "#333");
	})
	.on("mousemove", function(d) {
		if (d3.mouse(this)[0] > (width-200)) {
			tooltip.attr("transform", "translate("+(d3.mouse(this)[0]-200)+","+d3.mouse(this)[1]+")");
		} else {
			tooltip.attr("transform", "translate("+d3.mouse(this)[0]+","+d3.mouse(this)[1]+")");
		}
	})
	.on("mouseout", function(d) {
		tooltip.remove();
		tooltip = false;

		d3.select(this).attr("stroke", "#999");
	});
	
	// Create groups of data based on times
	var groups = groupTimes(); 

	var color = d3.scaleOrdinal(d3.schemeCategory20.reverse());
	var radiusScale = d3.scaleSqrt().domain([1, 65]).range([10, 50]);

	// Display pie chart for each group
	groups.forEach(function(d) {
		// Nest data by name and number of messages
		var data = d3.nest()
		.key(function (d) { return d.name; })
		.rollup(function (v) { return v.length; })
		.entries(d);

		var dates = d.map(function(e) { return e.date; });

		var medianDate = dates[Math.floor(dates.length/2)];
		var radius = radiusScale(d.length);

		// Make pie
		var pie = g.append("g")
		.attr("transform", "translate(" + x(medianDate) + ", " + (y(getMaxMsgs(dates)) - radius - 5) + ")");
		
		var arcs = d3.pie().value(function(d) { return d.value; })(data);

		var path = d3.arc()
		.outerRadius(radius)
		.innerRadius(0);

		var arc = pie.selectAll(".arc")
		.data(arcs)
		.enter().append("g")
		.attr("class", "arc");

		var tooltip = false; // tooltip for pie hover

		arc.append("path")
		.attr("d", path)
		.attr("fill", function(d) { return color(d.data.key); })
		.attr("opacity", 0.8)
		.on("mouseover", function(d) {
			if (!tooltip) {
				tooltip = g.append("g");
				tooltip.append("rect")
				.attr("width", 100)
				.attr("height", 30)
				.attr("opacity", 0.8)
				.attr("pointer-events", "none");

				tooltip.append("text")
				.text(function() {
					if (d.data.value > 1) {
						return d.data.key + ": " + d.data.value + " texts";
					} else {
						return d.data.key + ": " + d.data.value + " text";
					}
				})
				.attr("fill", "#fff")
				.attr("font-size", 10)
				.attr("font-family", "sans-serif")
				.attr("transform", "translate(50,20)")
				.attr("dominant-baseline", "center")
				.attr("text-anchor", "middle")
				.attr("pointer-events", "none");
			}

			d3.select(this).attr("stroke", "#999").attr("opacity", 1);
		})
		.on("mousemove", function() {
			if (d3.mouse(g.node())[0] > (width-100)) {
				tooltip.attr("transform", "translate("+(d3.mouse(g.node())[0]-100)+","+d3.mouse(g.node())[1]+")");
			} else {
				tooltip.attr("transform", "translate("+d3.mouse(g.node())[0]+","+d3.mouse(g.node())[1]+")");
			}
		})
		.on("mouseout", function() {
			tooltip.remove();
			tooltip = false;
			d3.select(this).attr("stroke", "none").attr("opacity", 0.8);
		});
	});

	// Add legend
	peopleData = d3.nest()
	.key(function (d) { return d.name; })
	.entries(rawData);

	var legend = g.append("g")
	.attr("transform", "translate(30,10)");

	for (var i = 0; i < peopleData.length; i++) {
		var person = legend.append("g").attr("data-name", peopleData[i].key)
		.attr("transform", "translate(0," + (i * 20) + ")");

		person.append("rect").attr("height", 10).attr("width", 10)
		.attr("fill", function() { return color(peopleData[i].key) });

		person.append("text")
		.attr("transform", "translate(15)")
		.text(peopleData[i].key)
		.attr("dominant-baseline", "hanging")
		.attr("font-size", 12);
	}	
}

// Group the timestamps that are within 3 hours of each other
function groupTimes() {
	var groups = [];
	var currentGroup = [];

	currentGroup.push(rawData[0]);
	for (var i = 1; i < rawData.length; i++) {

		var date = new Date(rawData[i-1].date);
		var nextDate = new Date(rawData[i].date);

		if ((date.getDay() == nextDate.getDay()) && (nextDate.getHours() - date.getHours() <= 3)) {
			currentGroup.push(rawData[i]);
		} else if ((date.getHours() - nextDate.getHours() >= 21)) {
			currentGroup.push(rawData[i]);
		} else {
			groups.push(currentGroup);
			currentGroup = [rawData[i]];
		}
	}
	groups.push(currentGroup);
	return groups;
}

// Get how many messages each person sent
function getMsgCounts(arr) {
	var msgCounts = {};
	arr.forEach(function(d) {
		if (!msgCounts[d.name]) {
			msgCounts[d.name] = 1;
		} else {
			msgCounts[d.name] += 1;
		}
	})
	return msgCounts;
}

// Get the maximum number of messages within a date range
function getMaxMsgs(dates) {
	var dateRange = nestedData.filter(function(d) { 
		return (new Date(d.key) >= dates[0] 
			 && new Date(d.key) <= dates[dates.length-1]); 
	});
	return d3.max(dateRange, function(d) { return d.value; });
}