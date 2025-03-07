console.log("D3 version:", d3.version);

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
  console.log(data);

  // load from CSV file (the capitals)
  const weather = await d3.csv('data/weather.csv');
  console.log(weather);

  // https://d3js.org/d3-geo/path 
  const path = d3.geoPath(); // path generator that will convert GeoJSON to SVG paths
  const projection = d3.geoAlbersUsa().scale(1300).translate([487.5, 305]);

  d3.select('svg')
    .append('g')
    .selectAll('path')
    .data(data)
    .enter()
    .append('path')
    .attr('d', path)
    .attr('fill', 'lightgrey')
    .attr('stroke', 'black')
    .attr('stroke-width', 0.5);  // this is the border of the states on the map 

  // filter out invalid data points
  const validWeather = weather.filter(d => projection([d.longitude, d.latitude]));
  console.log('Number of valid weather points', validWeather.length);

  // reduce the number of data points for performance
  const reducedWeather = validWeather.slice(0, 40000); // adjust the number as needed
  console.log('Number of weather points shown (reduced for performance', reducedWeather.length);


  // add the data points to the map using requestAnimationFrame for smoother rendering
  // honestly don't really know what RequestAnimationsFrame does but w/e
  function renderPoints() {
    d3.select('g')
      .selectAll('circle')
      .data(reducedWeather)
      .enter()
      .append('circle')
      .attr('cx', d => projection([d.longitude, d.latitude])[0])
      .attr('cy', d => projection([d.longitude, d.latitude])[1])
      .attr('r', 3)
      .attr('fill', 'red');
  }

  requestAnimationFrame(renderPoints);

  //THINGS TO DO
  // CHANGE ZOOM TO BOX ZOOM USING STATE PROJECTIONS
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
  
  // add zoom
  let zoom = d3.zoom()
    .on('zoom', handleZoom);

  // add an event handler that gets called when a zoom or pan event occurs.
  // The event handler receives a transform which can be applied to chart elements
  function handleZoom(e) {
    d3.select('g')
      .attr('transform', e.transform);
  }

  d3.select('svg')
    .call(zoom);
}

fetchData();