var states, allNames, namesByState, stateFips, nameList;
var projection = d3.geoAlbersUsa().scale(75);
var colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
	.domain([100, 1]);

var selectedName = "";
var selectedYear = Number(document.getElementById("year").value);
var selectedSex = "male";
var nameStateData, yearData, top1000data;

function parseLine(line) {
	line.num_births = Number(line.num_births.replace(",", ""));
	line.rank = Number(line.rank);
	line.year = Number(line.year);
	return line;
}

function parseFips(line) {
	return {
		state: line["Alpha code"],
		fips: Number(line["Numeric code"])
	}
}

/* Read in data files */
d3.queue()
.defer(d3.tsv, "data/top1000babynames.tsv", parseLine)
.defer(d3.tsv,"data/babynamesbystate.tsv", parseLine)
.defer(d3.json, "data/us.json")
.defer(d3.tsv, "data/statefips.tsv", parseFips)
.await(function(error, top1000, byState, us, fips) {
	allNames = d3.nest()
		.key(function(d) { return d.name; })
		.key(function(d) { return d.sex; })
		.entries(top1000);
	namesByState = byState;

	// Make namelist
	var datalist = d3.select("#names");
	nameList = d3.nest()
		.key(function (d) { return d.name; })
		.entries(namesByState);

	nameList = nameList.map(function(d) { return d.key; });

	nameList.sort(function (a, b) {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	})

	nameList.forEach(function (d) {
		datalist.append("div")
			.attr("class", "name-option")
			.attr("value", d)
			.text(d);
	})

	states = topojson.feature(us, us.objects.states);
	stateFips = fips;

	showMap();
	showChart();
})

function sanitizeInput(str) {
	var letters = str.trim().match(/[a-zA-Z]+/g); // trim and get rid of non-letters
	if (letters) {
		var joined = letters.join("");
		return joined.charAt(0).toUpperCase() + joined.slice(1); // capitalize first letter
	} 
	return "";
}

function showMap() {
	var svg = d3.select("#map svg");
	projection.fitExtent([[0,0], [svg.attr("width"), svg.attr("height")]], states);
	pathGenerator = d3.geoPath().projection(projection);

	var paths = svg.selectAll("path.state").data(states.features);
	
	var tooltip = false;

	paths.enter().append("path").attr("class", "state")
		.merge(paths)
		.attr("fill", "#d8d8d8")
		.attr("stroke", "#f8f8f8")
		.attr("d", function (state) {
			return pathGenerator(state);
		})
		/* Add tooltip on mouseover */
		.on("mouseover", function(state) { 
			if (!tooltip && yearData) {
				var currentState = getState(state.id);
				var hovertext;

				var stateData = yearData.filter(function (d) { return d["state"] == currentState; });
				if (stateData.length > 0) {
					hovertext = currentState + ": #" + stateData[0].rank + " (" + stateData[0].num_births + " births)";
				} else {
					hovertext = currentState + ": < #100";
				}

				tooltip = svg.append("g").attr("class", "tooltip");
				tooltip.append("rect")
				.attr("width", 100)
				.attr("height", 30)
				.attr("pointer-events", "none")
				.attr("opacity", 0.9)
				.attr("fill", "#fff")
				.attr("stroke", "#999");

				tooltip.append("text")
				.text(hovertext)
				.attr("font-size", 10)
				.attr("font-family", "sans-serif")
				.attr("transform", "translate(50,20)")
				.attr("dominant-baseline", "center")
				.attr("text-anchor", "middle")
				.attr("pointer-events", "none");
			}
		})
		.on("mousemove", function(d) {
			if (tooltip) {
				tooltip.attr("transform", "translate("+(d3.mouse(this)[0]-100)+","+(d3.mouse(this)[1]-30)+")");
			}
		})
		.on("mouseout", function(d) {
			if (tooltip) {
				tooltip.remove();
				tooltip = false;
			}
		});

	d3.select("#year").on("input", function() {
		selectedYear = Number(this.value);

		d3.select("#selectYear span").text(selectedYear);

		if (selectedName != "") {
			updateMap();
			updateTitles();
		}
	});

	var legend = svg.append("g").attr("transform", "translate(360,360)");

	legend.append("rect")
		.attr("height", 10)
		.attr("width", 100)
		.attr("stroke", "#000");

	// https://bl.ocks.org/pstuffa/d5934843ee3a7d2cc8406de64e6e4ea5
	var bars = legend.selectAll(".bars")
    	.data(d3.range(100), function(d) { return d; })
  		.enter().append("rect")
	    .attr("class", "bars")
	    .attr("x", function(d, i) { return i; })
	    .attr("y", 0)
	    .attr("height", 10)
	    .attr("width", 1)
    	.style("fill", function(d, i ) { return colorScale(100-d); })

    legend.append("text")
    	.text("Name Rank")
    	.attr("transform", "translate(50,-5)")
    	.attr("text-anchor", "middle")
    	.attr("font-size", 12);
    legend.append("text")
    	.text("100")
    	.attr("transform", "translate(-20,8)")
    	.attr("font-size", 10);
    legend.append("text")
    	.text("1")
    	.attr("transform", "translate(102,8)")
    	.attr("font-size", 10);
}

function updateMap() {
	d3.select("#message").text("");
	if (nameStateData) {
		yearData = nameStateData.filter(function (d) { return d.year == selectedYear; });

		d3.select("#map svg").selectAll("path.state").data(states.features).transition()
		.duration(200)
		.attr("fill", function(d) {
			var state = getState(d.id);
			var rank = yearData.filter(function(d) { return d["state"] == state; });
			if (rank.length > 0) return colorScale(rank[0]["rank"]);
			return "#d8d8d8";
		});
	} else {
		d3.select("#map svg").selectAll("path.state").data(states.features).transition()
		.duration(200)
		.attr("fill", "#d8d8d8");
	}
}

function updateTitles() {
	if (nameStateData) {
		d3.select("#map .title").text("Rank in top 100 by state for " + selectedName + " (" + selectedSex + ") in " + selectedYear);
	} else {
		d3.select("#map .title").text(selectedName + " (" + selectedSex + ") has never been in any state's top 100");
	}

	if (top1000data) {
		d3.select("#chart .title").text("Rank in top 1000 for " + selectedName + " (" + selectedSex + ")");
	} else {
		d3.select("#chart .title").text(selectedName + " (" + selectedSex + ") has never been in the overall top 1000");
	}
}

function showChart() {
	var svg = d3.select("#chart svg");
	var width = svg.attr("width"), height = svg.attr("height");
	var margin = {top: 10, right: 10, bottom: 30, left: 40};

	// Define scales and axes
	var xScale = d3.scaleLinear()
		.domain([1880, 2016])
		.range([0, width-margin.right-margin.left]);

	var xAxis = d3.axisBottom(xScale).ticks(10, "d");

	var yScale = d3.scaleLinear()
		.domain([1000, 1])
		.range([height-margin.top-margin.bottom, 0]);

	var yAxis = d3.axisLeft(yScale);

	var g = svg.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	g.append("g").call(xAxis).attr("transform", "translate(0," + (height - margin.top - margin.bottom) + ")");
	g.append("g").call(yAxis).attr("transform", "translate(0,0)");

	var horizontalLines = [900, 800, 700, 600, 500, 400, 300, 200, 100, 1];
	horizontalLines.forEach(function (d) {
		g.append("path")
			.attr("d", "M1,"+yScale(d)+"L"+xScale(2016)+","+yScale(d))
			.attr("stroke", "#e8e8e8");
	})

	var path = g.append("path")
		.attr("stroke-width", 2)
		.attr("fill", "none");

	// Draw line when name/sex is entered or changed
	var pathGenerator = d3.line()
		.x(function (d) { return xScale(d.year); })
		.y(function (d) { return yScale(d.rank); });
	var t = d3.transition()
	    .duration(750)
	    .ease(d3.easeLinear);

	function plotLine() {
		if (top1000data) {
			// http://bl.ocks.org/duopixel/4063326
			path.attr("d", function(d) { return pathGenerator(top1000data); })
			.attr("visibility", "visible")
			.attr("stroke", function() {
				if (selectedSex == "male") return "skyblue";
				return "pink";
			})
			.attr("class", "name-line");
			
			var totalLength = path.node().getTotalLength();

		    path
			.attr("stroke-dasharray", totalLength + " " + totalLength)
			.attr("stroke-dashoffset", totalLength)
			.transition()
				.duration(1000)
				.ease(d3.easeLinear)
				.attr("stroke-dashoffset", 0);

			d3.select("#message").text("");
		} else {
			path.attr("visibility", "hidden");
		}
	}

	d3.select("#name").on("input", function() {
		selectedName = sanitizeInput(this.value);

		if (selectedName != "") {
			nameStateData = getStateData(selectedName, selectedSex);

			top1000data = getTop1000Data(selectedName, selectedSex);
			nameStateData = getStateData(selectedName, selectedSex);
			if (top1000data || nameStateData) {
				updateMap();
				updateTitles();
				plotLine();
				showInfo();
			} else {
				d3.select("#message").text("Name not found");
			}
		} else {
			d3.select("#message").text("");
		}
	}).on("keyup", function() {
		d3.select("#names").style("visibility", "visible");

		// Autocomplete
		var input = sanitizeInput(this.value);
		var match; 
		if (input != "") {
			var regex = new RegExp(input, "gi");
			match = nameList.filter(function (d) { return d.match(regex); });
		} else {
			match = nameList;
		}

		d3.selectAll(".name-option").remove();

		match.forEach(function (d) {
			d3.select("#names").append("div")
			.attr("class", "name-option")
			.attr("value", d)
			.text(d).on("click", function() {
				d3.select("#names").style("visibility", "hidden"); // hide list
				document.getElementById("name").value = this.innerHTML; // update textbox

				// Show stats
				selectedName = this.innerHTML;
				nameStateData = getStateData(selectedName, selectedSex);
				top1000data = getTop1000Data(selectedName, selectedSex);

				if (top1000data || nameStateData) {
					updateMap();
					updateTitles();
					plotLine();
					showInfo();
				} else {
					d3.select("#message").text("Name not found");
				}
			});
		});
	});
	
	// Hide names list when click outside
	document.addEventListener("click", function(e) {	
		if (!e.target.classList.contains("name-option")) {
			d3.select("#names").style("visibility", "hidden");
        }
	})

	d3.selectAll("#sex input").on("change", function() {
		selectedSex == "male" ? selectedSex = "female" : selectedSex = "male";

		nameStateData = getStateData(selectedName, selectedSex);

		if (selectedName.trim() != "") {
			top1000data = getTop1000Data(selectedName, selectedSex);
			nameStateData = getStateData(selectedName, selectedSex);
			if (top1000data || nameStateData) {
				updateMap();
				updateTitles();
				plotLine();
				showInfo();
			} else {
				d3.select("#message").text("Name not found");
			}
		}
	})

	// Add line and dot on hover
	var hoverArea = g.append("rect")
		.attr("height", height - margin.top - margin.bottom)
		.attr("width", width - margin.left - margin.right)
		.attr("fill", "rgba(0,0,0,0)");

	var hoverInfo = false, hoverLine, hoverDot, hoverBox;

	hoverArea.on("mouseover", function(d) {
		if (!hoverInfo && top1000data) {
			hoverInfo = g.append("g");
			hoverLine = g.append("path")
				.attr("d", "M" + d3.mouse(this)[0] + "," + yScale(1000) + "L" + d3.mouse(this)[0] + "," + yScale(1))
				.attr("stroke", "#666")
				.attr("stroke-width", 1)
				.attr("pointer-events", "none");;

			var currentYear = Math.round(xScale.invert(d3.mouse(this)[0]));
			var rank = top1000data.filter(function (d) { return d.year == currentYear; })[0].rank;
			var births = top1000data.filter(function (d) { return d.year == currentYear; })[0].num_births;

			hoverDot = g.append("circle")
				.attr("r", 3)
				.attr("cx", d3.mouse(this)[0])
				.attr("cy", function() {
					return yScale(rank);
				})
				.attr("pointer-events", "none");

			hoverBox = g.append("g")
				.attr("transform", "translate(" + (d3.mouse(this)[0] - 120) + "," + (d3.mouse(this)[1] - 70) + ")")
				.attr("pointer-events", "none");

			hoverBox.append("rect")
				.attr("width", 120)
				.attr("height", 70)
				.attr("fill", "#fff")
				.attr("stroke", "#d8d8d8");

			hoverBox.append("text").attr("id", "currentYear")
				.text(currentYear)
				.attr("font-size", 14)
				.attr("font-weight", "bold")
				.attr("transform", "translate(10,20)");

			hoverBox.append("text").attr("id", "currentRank")
				.text(function() {
					if (rank == 1001) {
						return "Not in top 1000";
					}
					return "Rank: #" + rank;
				})
				.attr("font-size", 12)
				.attr("transform", "translate(10,40)");

			hoverBox.append("text").attr("id", "currentBirths")
				.text(function() {
					return "Births: " + births;
				})
				.attr("font-size", 12)
				.attr("transform", "translate(10,60)");
		}
	}).on("mousemove", function(d) {
		if (hoverInfo) {

			var currentYear = Math.round(xScale.invert(d3.mouse(this)[0]));
			var rank = top1000data.filter(function (d) { return d.year == currentYear; })[0].rank;
			var births = top1000data.filter(function (d) { return d.year == currentYear; })[0].num_births;

			hoverLine.attr("d", "M" + d3.mouse(this)[0] + "," + yScale(1000) + "L" + d3.mouse(this)[0] + "," + yScale(1));
			hoverDot.attr("cx", d3.mouse(this)[0])
			.attr("cy", function() {
				return yScale(rank);
			});
			hoverBox.attr("transform", "translate(" + (d3.mouse(this)[0] - 120) + "," + (d3.mouse(this)[1] - 70) + ")");
			
			d3.select("#currentYear").text(currentYear);

			d3.select("#currentRank").text(function() {
				if (rank == 1001) {
					return "Not in top 1000";
				}
				return "Rank: #" + rank;
			});

			d3.select("#currentBirths").text(function() {
				return "Births: " + births;
			});
		}
	}).on("mouseout", function(d) {
		if (hoverInfo) {
			hoverInfo.remove();
			hoverInfo = false;
			hoverLine.remove();
			hoverDot.remove();
			hoverBox.remove();
		}
	});

}

function getTop1000Data(name, sex) {
	var nameData = allNames.filter(function (d) { return d.key == name; })[0];
	var nameAndSexData = false; 
	var data = false;

	if (nameData) {
		nameAndSexData = nameData.values.filter(function (d) { return d.key == sex; })[0];
	}

	if (nameAndSexData) {
		data = [];
		for (var i = 1880; i < 2017; i++) {
			var elem = nameAndSexData.values.find(function (d) { return d.year == i });
			if (elem) {
				data.push(elem);
			} else {
				var obj = {
					"name": name, 
					"num_births": 0, 
			 		"rank": 1001, 
					"sex": sex, 
					"year": i
				}
				data.push(obj);
			}
		}
	}
	return data;
}

function getStateData(name, sex) {
	var nameData = namesByState.filter(function (d) { return d["name"] == name; });
	var nameAndSexData = false; 

	if (nameData.length > 0) {
		var data = nameData.filter(function (d) { return d["sex"] == sex; });
		if (data.length > 0) nameAndSexData = data;
	}

	return nameAndSexData;
}

function getState(fips) {
	return stateFips.filter(function(d) { return (d["fips"] == fips); })[0].state;
}

// Return array of states/years where a name was highest ranked
function getMaxRank(name, sex) {
	var nameData = getStateData(name, sex);
	var max = [];
	var highestRank = 101;
	nameData.forEach(function (d) {
		if (d.rank < highestRank) {
			max = [d];
			highestRank = d.rank;
		} else if (d.rank == highestRank) {
			max.push(d);
		}
	})
	return max;
}

var regions = {
	// https://www.wikiwand.com/en/List_of_regions_of_the_United_States
	// Large regions
	"Northeast": ["CT", "ME", "MA", "NH", "RI", "VT", "DE", "NJ", "NY", "PA"],
	"Midwest": ["IL", "IN", "MI", "OH", "WI", "IA", "KS", "MN", "MO", "NE", "ND", "SD"],
	"South": ["FL", "GA", "MD", "NC", "SC", "VA", "DC", "WV", "AL", "KY", "MS", "TN", "AR", "LA", "OK", "TX"],
	"West": ["AZ", "CO", "ID", "MT", "NV", "NM", "UT", "WY", "AK", "CA", "HI", "OR", "WA"],
	// Small regions
	"New England": ["CT", "ME", "MA", "NH", "RI", "VT"],
	"Mid-Atlantic": ["DE", "NJ", "NY", "PA"],
	"East North Central": ["IL", "IN", "MI", "OH", "WI"],
	"West North Central": ["IA", "KS", "MN", "MO", "NE", "ND", "SD"],
	"South Atlantic": ["FL", "GA", "MD", "NC", "SC", "VA", "DC", "WV"],
	"East South Central": ["AL", "KY", "MS", "TN"],
	"West South Central": ["AR", "LA", "OK", "TX"],
	"Mountain": ["AZ", "CO", "ID", "MT", "NV", "NM", "UT", "WY"],
	"Pacific": ["AK", "CA", "HI", "OR", "WA"]
}

// Return region where name is most popular
function getMostPopularRegion(name, sex) {
	var nameData = getStateData(name, sex);
	var nameByRegion = d3.nest().key(function(d) {
		if (regions.Northeast.indexOf(d.state) != -1) return "Northeast";
		if (regions.Midwest.indexOf(d.state) != -1) return "Midwest";
		if (regions.South.indexOf(d.state) != -1) return "South";
		if (regions.West.indexOf(d.state) != -1) return "West";
	}).entries(nameData);
	nameByRegion.sort(function (a, b) {
		return b.values.length > a.values.length; 
	})
	return nameByRegion[0].key;
}

function getMaxOverallRank() {
	if (top1000data) {
		var maxRank = 1000;
		var year;
		top1000data.forEach(function (d) {
			if (d.rank < maxRank) {
				maxRank = d.rank;
				year = d.year;
			}
		})
		return {"year": year, "rank": maxRank};
	}
	return false;
}

function getNumberOfBabies() {
	if (top1000data) {
		var sum = d3.sum(top1000data, function(d) { return d.num_births; });
		return sum;
	}
	return false;
}

function showInfo() {
	var nameInfo = d3.select("#nameInfo").html("");

	var html = "<h3>About " + selectedName + "</h3><ul>";

	if (top1000data) {
		var data = getMaxOverallRank();
		html += "<li>It peaked overall at #" + data.rank + " in " + data.year + "</li>";
		html += "<li>Approximately " + getNumberOfBabies() + " " + selectedSex + "s named " + selectedName + " have been born since 1880</li>";
	} else {
		html += "<li>It has never been in the top 1000</li>";
	}

	if (nameStateData) {

		html += "</li><li>It has had the most top 100 appearances in the " + getMostPopularRegion(selectedName, selectedSex) + "</li>";

		var data = getMaxRank(selectedName, selectedSex);
		html += "<li>Its maximum state-level rank was #" + data[0].rank + " in ";
		html += data[0].state + " (" + data[0].year + ")";
		if (data.length > 1 && data.length <= 5) {
			for (var i = 1; i < data.length-1; i++) {
				html += ", " + data[i].state + " (" + data[i].year + ")";
			}
			html += " and " + data[data.length-1].state + " (" + data[data.length-1].year + ")";
		} else if (data.length > 5) {
			for (var i = 1; i < 6; i++) {
				html += ", " + data[i].state + " (" + data[i].year + ")";
			}
			html += " and " + (data.length - 5) + " more ";

			//TODO: Show/hide full list of states
		}

	} else {
		html += "<li>It has never been in any state's top 100</li>";
	}

	html += "</ul>";
	nameInfo.html(html);
}
