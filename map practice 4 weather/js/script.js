console.log("D3 version:", d3.version);

const width = 975;
const height = 610;


const options = ['TMIN','TMAX','TAVG','AWND','WDF5','WSF5','SNOW','SNWD','PRCP'];
let currVar = options[0]; // Declare currVar here

// https://observablehq.com/@jeantimex/how-to-draw-a-us-map
// https://observablehq.com/@d3/u-s-state-capitals 
// trying to use some of the tutorials online, youtube videos, + some of the observable graph galleries
// (altho those are a little harder to use bc of the obsserable notebook does things a bit differnently)

async function fetchData() {

  // load from JSON file (the states)
  // https://d3js.org/d3-geo/conic#geoAlbersUsa 
  const states = await d3.json('data/states-albers-10m.json');
  console.log(states);

  // turn that JSON file data (state) into a GeoJSON object using topojson library
  data = topojson.feature(states, states.objects.states).features;
  console.log('logging data -- geoJSON object hopefully')
  console.log(data);

  // load from CSV file (the capitals)
  const weather = await d3.csv('data/weather.csv');
  console.log(weather);

  // https://d3js.org/d3-geo/path 
  const path = d3.geoPath(); // path generator that will convert GeoJSON to SVG paths
  const projection = d3.geoAlbersUsa().scale(1300).translate([487.5, 305]);

  const svg = d3.select('svg')
    .on('click', reset);
  
  const g = svg.append('g');

  const states_g = g
    .append('g')
    .attr("cursor", "pointer")
    .selectAll('path')
    .data(data)
    .enter()
    .append('path')
    .attr('d', path) // drawing the state borders on the map
    .attr('fill', 'lightgrey')
    .attr('stroke', 'black')
    .attr('stroke-width', 0.5)  // this is the border of the states on the map 
    .on("click", clicked); // when a state is clicked, call the clicked function 

  // filter out invalid data points
  const validWeather = weather.filter(d => projection([d.longitude, d.latitude]));
  console.log('Number of valid weather points', validWeather.length);

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
          .attr('fill', 'red')
          .on('mouseover', function (event, d) {
            console.log(d) // See the data point in the console for debugging
            d3.select('#tooltip')
                // if you change opacity to hide it, you should also change opacity here
                .style("display", 'block') // Make the tooltip visible
                .html( // Change the html content of the <div> directly
                `<strong>${d.station}</strong><br/>
                state: ${d.state} <br/>
                date: ${d.date}`)
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
            .attr('fill', d => {
              if (currVar == 'TMIN') {
                console.log('tmin color', d.TMIN/100)
                return d3.interpolateReds(d.TMIN/100)
              } else if (currVar == 'TMAX') {
                console.log('tmax color', d.TMIN/100)
                return d3.interpolateBlues(d.TMAX/100)
              } else if (currVar == 'TAVG') {
                return d3.interpolateGreens(d.TAVG/100)
              }
            }) // color based on the data
        }, 
        function(exit){
          return exit.remove();
        }
      )

    d3.select('#dayDisplay').text(selectedDate);
  }

  d3.select('#daySlider').on('input', function () {
    updatePoints(+this.value);
  });

  updatePoints(minDateIndex);

  // AND THAT WILL UPDATE SIZE OF DOTS

  // CHANGE DOTS INTO ARROWS
  // ALSO THERE IS A TIME ELEMENT
  // SINCE WE HAVE 400K DATA POINTS, WE CAN USE THAT TO ANIMATE THE ARROWS
  // SO THAT THEY MOVE IN A DIRECTION BASED ON THE WIND DIRECTION
  // AND THE SPEED OF THE ARROW IS BASED ON THE WIND SPEED

  // AND THE TIME
  // SO WE DONT HAVE TO SHOW 400K DATA POINTS AT ONCE
  // WE CAN SHOW THEM OVER TIME
  // SO WE CAN HAVE A SLIDER TO CHANGE THE TIME

  // resets a state back to it's normal color and zooms out

  // https://observablehq.com/@d3/zoom-to-bounding-box
  function reset() {
    console.log('resetting')
    states_g.transition().style("fill", null);
    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity,
      d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
    );
  }

  // add an event handler that gets called when a state is clicked (turns the state red, zooms in
  function clicked(event, d) {
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


  d3.select('#dropdown')
    .selectAll('option')
    .data(options)
    .enter()
    .append('option')
    .attr('value', d => d)
    .text(d => d)
  
  d3.select('#dropdown')
    .on("change", function (event) {
      console.log(d3.select(this).property("value"));
      currVar = d3.select(this).property("value");
  
      //call Update function
      updatePoints(+d3.select('#daySlider').property('value'));
    });
}

fetchData();