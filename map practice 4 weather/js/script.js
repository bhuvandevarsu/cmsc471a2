console.log("D3 version:", d3.version);

const width = 975;
const height = 610;

//https://d3-graph-gallery.com/graph/line_basic.html
// set the dimensions and margins of the graph
const margin = {top: 10, right: 30, bottom: 30, left: 60}
const options = ['TMIN','TMAX','TAVG','AWND','WDF5','WSF5','SNOW','SNWD','PRCP'];
var currVar = options[2]; // Declare currVar here
let active = d3.select(null);


// Define a mapping from state abbreviations to full state names
const stateAbbrevToName = {
  "AL": "Alabama",
  "AK": "Alaska",
  "AZ": "Arizona",
  "AR": "Arkansas",
  "CA": "California",
  "CO": "Colorado",
  "CT": "Connecticut",
  "DE": "Delaware",
  "FL": "Florida",
  "GA": "Georgia",
  "HI": "Hawaii",
  "ID": "Idaho",
  "IL": "Illinois",
  "IN": "Indiana",
  "IA": "Iowa",
  "KS": "Kansas",
  "KY": "Kentucky",
  "LA": "Louisiana",
  "ME": "Maine",
  "MD": "Maryland",
  "MA": "Massachusetts",
  "MI": "Michigan",
  "MN": "Minnesota",
  "MS": "Mississippi",
  "MO": "Missouri",
  "MT": "Montana",
  "NE": "Nebraska",
  "NV": "Nevada",
  "NH": "New Hampshire",
  "NJ": "New Jersey",
  "NM": "New Mexico",
  "NY": "New York",
  "NC": "North Carolina",
  "ND": "North Dakota",
  "OH": "Ohio",
  "OK": "Oklahoma",
  "OR": "Oregon",
  "PA": "Pennsylvania",
  "RI": "Rhode Island",
  "SC": "South Carolina",
  "SD": "South Dakota",
  "TN": "Tennessee",
  "TX": "Texas",
  "UT": "Utah",
  "VT": "Vermont",
  "VA": "Virginia",
  "WA": "Washington",
  "WV": "West Virginia",
  "WI": "Wisconsin",
  "WY": "Wyoming"
};

// https://observablehq.com/@jeantimex/how-to-draw-a-us-map
// https://observablehq.com/@d3/u-s-state-capitals
// trying to use some of the tutorials online, youtube videos, + some of the observable graph galleries
// (altho those are a little harder to use bc of the obsserable notebook does things a bit differnently)
async function fetchData() {

  // load from JSON file (the states)
  // https://d3js.org/d3-geo/conic#geoAlbersUsa
  const us = await d3.json('data/counties-albers-10m.json');
  console.log(us);

  // turn that JSON file data (state) into a GeoJSON object using topojson library
  data = topojson.feature(us, us.objects.states).features;
  data_counties = topojson.feature(us, us.objects.counties).features;
  
  console.log('logging data -- geoJSON object hopefully')
  console.log(data);

  // load from CSV file (the capitals)
  const weather = await d3.csv('data/weather.csv');
  console.log('logging weather data')
  console.log(weather);

  // https://d3js.org/d3-geo/path
  const path = d3.geoPath(); // path generator that will convert GeoJSON to SVG paths
  const projection = d3.geoAlbersUsa().scale(1300).translate([487.5, 305]);

  const svg = d3.select('svg')
    .on('click', reset);
    
  const g = svg.append('g');

  // some code for zoom into counties map taken from
  // https://gist.github.com/ElefHead/ebff082d41ef8b9658059c408096f782
  const counties_g = g
    .append("g")
    .attr("id", "counties")
    .selectAll("path")
    .data(data_counties)
    .enter().append("path")
    .attr("d", path)
    .attr("class", "county-boundary")
    .on("click", reset);

  const states_g = g
    .append('g')
    .attr("cursor", "pointer")
    .attr("id", "states")
    .selectAll('path')
    .data(data)
    .enter()
    .append('path')
    .attr('d', path) // drawing the state borders on the map
    .attr('fill', 'lightgrey')
    .attr('stroke', 'black')
    .attr('stroke-width', 0.5)  // this is the border of the states on the map
    .attr("class", "state")
    .on("click", clicked); // when a state is clicked, call the clicked function

  g.append("path")
    .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
    .attr("id", "state-borders")
    .attr("d", path);
  
  // filter out invalid data points (that don't have a valid longitude/latitude projection)
  const validWeather = weather.filter(d => projection([d.longitude, d.latitude]));
  console.log('Number of valid weather points for entire data set', validWeather.length);

  validWeather.forEach(d => {
    d.date = d.date.toString();
    d.year = +d.date.substring(0, 4);
    d.month = +d.date.substring(4, 6);
    d.day = +d.date.substring(6, 8);
    d.formattedDate = `${d.year}-${d.month.toString().padStart(2, '0')}-${d.day.toString().padStart(2, '0')}`;
  });

  let uniqueDates = [...new Set(validWeather.map(d => d.formattedDate))].sort();
  let minDateIndex = 0;
  let maxDateIndex = uniqueDates.length - 1;

  d3.select('#daySlider').attr('min', minDateIndex).attr('max', maxDateIndex).attr('value', minDateIndex);
  d3.select('#dayDisplay').text(uniqueDates[minDateIndex]);

  // Calculate extents to help generate color scales
  const tempExtent = d3.extent(Array.from(validWeather.filter(d => d.TAVG != ""), d => d.TAVG));
  const windExtent = d3.extent(Array.from(validWeather.filter(d => d.AWND != ""), d => d.AWND));
  const precipExtent = d3.extent(Array.from(validWeather.filter(d => d.PRCP != ""), d => d.PRCP));
  const snowExtent = d3.extent(Array.from(validWeather.filter(d => d.SNOW != ""), d => d.SNOW));
  const depthExtent = d3.extent(Array.from(validWeather.filter(d => d.SNWD != ""), d => d.SNWD));

  console.log(tempExtent)
  console.log('snowExtent', snowExtent)
  
  // Define color scales (adjusted domains for visual clarity)
  const tempColorScale = d3.scaleSequential(d3.interpolateRdBu) 
    .domain([tempExtent[1],tempExtent[0]]) 
    .clamp(true);
  
  const windColorScale = d3.scaleSequential(d3.interpolateGreens)
    .domain([windExtent[0],windExtent[1]*.33])
    .clamp(true);

  const precipColorScale = d3.scaleSequential(d3.interpolatePurples)
    .domain([precipExtent[0],precipExtent[1]*.15])
    .clamp(true);

  const snowColorScale = d3.scaleSequential(d3.interpolateBlues)
    .domain([snowExtent[0],snowExtent[1]*.15])
    .clamp(true);

  const depthColorScale = d3.scaleSequential(d3.interpolateGreys)
    .domain([depthExtent[0],depthExtent[1]*.6])
    .clamp(true);

  function updatePoints(dateIndex) {
    let selectedDate = uniqueDates[dateIndex];
    const filteredWeather = validWeather.filter(d => d.formattedDate === selectedDate);
    console.log(`Displaying data for date: ${selectedDate}, points: ${filteredWeather.length}, currVar: ${currVar}`);
    
    d3.select('g')
      .selectAll('circle')
      .data(filteredWeather)
      .join(
        function(enter){
          return enter.append('circle')
          .attr('cx', d => projection([+d.longitude, +d.latitude])[0])
          .attr('cy', d => projection([+d.longitude, +d.latitude])[1])
          .attr('r', 2)
          .attr('fill', d => tempColorScale((+d.TMAX + +d.TMIN) / 2))
          .on('mouseover', function (event, d) {
            console.log(d) // See the data point in the console for debugging
            d3.select('#tooltip')
                .style("display", 'block') // Make the tooltip visible
                .html( // Change the html content of the <div> directly
                `<strong>${d.station}</strong><br/>
                state: ${d.state} <br/>
                date: ${d.date} <br/>
                average temperature: ${d.TAVG} <br/>
                min temp: ${d.TMIN} <br/> 
                max temp: ${d.TMAX} <br/>
                average wind speed: ${d.AWND} <br/>
                average precipitation: ${d.PRCP} <br/>
                average snowfall: ${d.SNOW} <br/>`)
                .style("left", (event.pageX + 20) + "px")
                .style("top", (event.pageY - 28) + "px");

            d3.select(this) // Refers to the hovered circle
                .style('stroke', 'black')
                .style('stroke-width', '1px')
          })
          .on("mouseout", function (event, d) {
              d3.select('#tooltip')
                .style('display', 'none') // Hide tooltip when cursor leaves
              
              d3.select(this) // Refers to the hovered circle
                  .style('stroke-width', '0px')
          })
        },
        function(update){
          return update
            .attr('cx', d => projection([+d.longitude, +d.latitude])[0])
            .attr('cy', d => projection([+d.longitude, +d.latitude])[1])  
            .attr('fill', d => {
              if (currVar == 'SNWD') {
                 return depthColorScale(d.SNWD)
              } else if (currVar == 'AWND') {
                  return windColorScale(d.AWND)
              } else if (currVar == 'PRCP') {
                  return precipColorScale(d.PRCP)
              } else if (currVar == 'SNOW') {
                  return snowColorScale(d.SNOW)
              } else {
                return tempColorScale((+d.TMAX + +d.TMIN) / 2) //USING INSTEAD OF AVG, SINCE LOTS OF NULL VALUES FOR AVG (33%) vs (.3%) for min/max
              }
            }) 
        }, 
        function(exit){
          return exit.remove();
        }
      )

    d3.select('#dayDisplay').text(selectedDate);
    updateStateColors(selectedDate);
  }

  d3.select('#daySlider').on('input', function () {
    updatePoints(+this.value);
    console.log(+this.value)
  });

  updatePoints(minDateIndex);

  function updateStateColors(selectedDate) {
    // Get the index of the selected date
    const selectedIndex = uniqueDates.indexOf(selectedDate);

    // Calculate the start and end indices for the 5-day window
    const startIndex = Math.max(0, selectedIndex - 2);
    const endIndex = Math.min(uniqueDates.length - 1, selectedIndex + 2);
  
    // Get the dates within the 5-day window
    const dateWindow = uniqueDates.slice(startIndex, endIndex + 1);
  
    // Filter the weather data for the dates within the 5-day window
    const filteredWeather = validWeather.filter(d => dateWindow.includes(d.formattedDate));
  
    // Filter snow for null values, and get state aggregates for snow
    const snowAggregates = d3.rollup(
      filteredWeather.filter(d => d.SNOW != ""),
      v => ({
        avgSnow: d3.mean(v,d => +d.SNOW)
      }),
      d => stateAbbrevToName[d.state] // Convert abbreviation to full name
    )    

    // Filter snow depth for null values, and get state aggregates for snow depth
    const depthAggregates = d3.rollup(
      filteredWeather.filter(d => d.SNWD != ""),
      v => ({
        avgDepth: d3.mean(v,d => +d.SNWD)
      }),
      d => stateAbbrevToName[d.state] // Convert abbreviation to full name
    )    

    // Slice off the last entry if it's undefined
    snowAggregates.delete(undefined);
    depthAggregates.delete(undefined);

    // Get the rest (Temp, Wind, Precip)
    const stateAggregates = d3.rollup(
      filteredWeather,
      v => ({
        avgTemp: d3.mean(v, d => 
          {
          if (+d.TAVG != 0){
            return +d.TAVG
          } else {
            return (+d.TMAX + +d.TMIN)/2
          }
          }),
        avgWind: d3.mean(v, d => +d.AWND),
        avgPrecip: d3.mean(v, d => +d.PRCP)
      }),
      d => stateAbbrevToName[d.state] // Convert abbreviation to full name
    );
    
    // Update the fill for each state
    states_g.attr("fill", d => {
      const agg = stateAggregates.get(d.properties.name);
      if (!agg) return "lightgrey"; // fallback if no data exists for a state
      if (currVar=='TAVG') {
         return tempColorScale(agg.avgTemp);
      } else if (currVar=='AWND') {
         return windColorScale(agg.avgWind);
      } else if (currVar=='PRCP') {
         return precipColorScale(agg.avgPrecip);
      } else if (currVar=='SNOW') {
          return snowColorScale(snowAggregates.get(d.properties.name).avgSnow);
      } else if (currVar=='SNWD'){
        return depthColorScale(depthAggregates.get(d.properties.name).avgDepth)
      } else {
         return "lightgrey"; // default color if no box is selected
      }
    });
  }

  // Zoom function helper (resetting back to national level view)
  // https://observablehq.com/@d3/zoom-to-bounding-box
  function reset() {
    active.classed("active", false);
    active = d3.select(null);
    
    console.log('resetting zoom to national view')
    states_g.transition().style("fill", null);
    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity,
      d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
    );
  }

  // add an event handler that gets called when a state is clicked
  function clicked(event, d) {
    
    if (d3.select('.background').node() === this) return reset();
    if (active.node() === this) return reset();
    active.classed("active", false);
    active = d3.select(this).classed("active", true);

    const [[x0, y0], [x1, y1]] = path.bounds(d);
    event.stopPropagation();
    states_g.transition().style("fill", null);
    d3.select(this).transition().style("fill", "yellow");
    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
        .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
      d3.pointer(event, svg.node())
    );
  }

  // add an event handler that gets called when a zoom or pan event occurs.
  // The event handler receives a transform which can be applied to chart elements
  function zoomed(event) {
    d3.select('g')
      .attr('transform', event.transform)
      .attr('stroke-width', 1 / event.transform.k);
    }

  let zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', zoomed);

  d3.select('svg')
    .call(zoom);


  d3.select("#tempGradient").on("change", function() { 
    if (this.checked) { 
      d3.select("#windGradient").property("checked", false);
      d3.select("#precipGradient").property("checked", false);
      d3.select("#snowGradient").property("checked", false);
      d3.select("#depthGradient").property("checked", false); 
      currVar = 'TAVG';
      updateStateColors(d3.select('#dayDisplay').text());
      updatePoints(+document.getElementById("daySlider").value) 
    }
  });
    
  d3.select("#windGradient").on("change", function() { 
    console.log('wind gradient change')
    if (this.checked) { 
      console.log('wind gradient checked')
      d3.select("#tempGradient").property("checked", false);
      d3.select("#precipGradient").property("checked", false);
      d3.select("#snowGradient").property("checked", false); 
      d3.select("#depthGradient").property("checked", false); 
      currVar = 'AWND';
      updateStateColors(d3.select('#dayDisplay').text());
      updatePoints(+document.getElementById("daySlider").value); 
    }
  });
    
  d3.select("#precipGradient").on("change", function() { 
    if (this.checked) { 
      d3.select("#tempGradient").property("checked", false);
      d3.select("#windGradient").property("checked", false);
      d3.select("#snowGradient").property("checked", false); 
      d3.select("#depthGradient").property("checked", false); 
      currVar = 'PRCP';
      updateStateColors(d3.select('#dayDisplay').text());
      updatePoints(+document.getElementById("daySlider").value); 
    }
  });
    
  d3.select("#snowGradient").on("change", function() { 
    if (this.checked) { 
      d3.select("#tempGradient").property("checked", false);
      d3.select("#windGradient").property("checked", false);
      d3.select("#precipGradient").property("checked", false); 
      d3.select("#depthGradient").property("checked", false); 
      currVar = 'SNOW';
      updateStateColors(d3.select('#dayDisplay').text());
      updatePoints(+document.getElementById("daySlider").value); 
    } 
   });

    d3.select("#depthGradient").on("change", function() { 
      if (this.checked) { 
        d3.select("#tempGradient").property("checked", false);
        d3.select("#windGradient").property("checked", false);
        d3.select("#precipGradient").property("checked", false); 
        d3.select('#snowGradient').property("checked",false);
        currVar = 'SNWD';
        updateStateColors(d3.select('#dayDisplay').text());
        updatePoints(+document.getElementById("daySlider").value); 
      }
    });
}

fetchData();