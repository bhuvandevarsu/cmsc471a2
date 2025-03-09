// set margin
const margin = { top: 80, right: 60, bottom: 60, left: 100 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

let allData = []
let xVar = 'income', yVar = 'lifeExp', sizeVar = 'population', targetYear = 2000
let xScale, yScale, sizeScale
const continents = ['Africa', 'Asia', 'Oceania', 'Americas', 'Europe']
const colorScale = d3.scaleOrdinal(continents, d3.schemeSet2); // d3.schemeSet2 is a set of predefined colors
const options = ['income', 'lifeExp', 'gdp', 'population', 'childDeaths']

// global variable for transition length
const t = 1000; // 1000ms = 1 second

// Create SVG
const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

// Loading CSV data
// using init() to only load data after the page is loaded with event listener
function init(){
    d3.csv("./data/gapminder_subset.csv", d => ({ 
        country: d.country,
        continent: d.continent,
        year: +d.year, // using + to convert to numbers; same below
        lifeExp: +d.life_expectancy, 
        income: +d.income_per_person, 
        gdp: +d.gdp_per_capita, 
        childDeaths: +d.number_of_child_deaths,
        population: +d.population
    }))
    .then(data => {
            console.log(data) // Check the structure in the console
            allData = data // Save the processed data
            setupSelector()
            
            // Initial rendering steps:
            // P.S. You could move these into setupSelector(), 
            // but calling them separately makes the flow clearer.
            updateAxes()
            updateVis()
            addLegend()
        })
    .catch(error => console.error('Error loading data:', error));
}

function setupSelector(){
    // Handles UI changes (sliders, dropdowns)
    // Anytime the user tweaks something, this function reacts.
    // May need to call updateAxes() and updateVis() here when needed!

    let slider = d3
        .sliderHorizontal()
        .min(d3.min(allData.map(d => +d.year))) // setup the range
        .max(d3.max(allData.map(d => +d.year))) // setup the range
        .step(1)
        .width(width)  // Widen the slider if needed
        .displayValue(false)
        .default(targetYear) // Default value
        .on('onchange', (val) => {
            d3.select('#value').text(val)
            targetYear = +val // Update the year
            updateVis(); // Refresh the chart
        });

    d3.select('#slider')
        .append('svg')
        .attr('width', width)  // Adjust width if needed
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)')
        .call(slider);

    d3.selectAll('.variable')
    // loop over each dropdown button
    .each(function() {
        d3.select(this).selectAll('myOptions')
        .data(options)
        .enter()
        .append('option')
        .text(d => {
            if (d === 'income') {
                return 'Income per Person'
            } else if (d === 'lifeExp') {
                return 'Life Expectancy'
            } else if (d === 'gdp') {
                return 'GDP per capita'
            } else if (d === 'population') {
                return 'Population'
            } else if (d === 'childDeaths') {
                return 'Child Deaths'
            } else
                return d // Default to the variable name
        }) // The displayed text
        .attr("value",d => d) // The actual value used in the code
    })

    d3.select('#xVariable').property('value', xVar)
    d3.select('#yVariable').property('value', yVar)
    d3.select('#sizeVariable').property('value', sizeVar)

    d3.selectAll('.variable')
        .each(function() {
            // ... Loop over each dropdown button
        })
        .on("change", function (event) {
            // Placeholder: we’ll change xVar, yVar, or sizeVar here
            console.log(d3.select(this).property("id")) // Logs which dropdown (e.g., xVariable)
            console.log(d3.select(this).property("value")) // Logs the selected value
            
            // Your turn: Map to global variables
            if (d3.select(this).property("id") == "xVariable") {
                xVar = d3.select(this).property("value")
            } 
            
            if (d3.select(this).property("id") == "yVariable") {
                yVar = d3.select(this).property("value")
            }
            
            if (d3.select(this).property("id") == "sizeVariable") {
                sizeVar = d3.select(this).property("value")
            }   
            
            updateAxes();
            updateVis();
        })
}


function updateAxes(){
    svg.selectAll('.axis').remove()
    svg.selectAll('.labels').remove()
    xScale = d3.scaleLinear()
        .domain([0, d3.max(allData, d => d[xVar])])
        .range([0, width]);

    const xAxis = d3.axisBottom(xScale)
        .tickFormat((d) => d3.format(".2s")(d)) // Format ticks as 1k, 1M, etc.
       
       
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`) // Position at the bottom
        .call(xAxis);

    yScale = d3.scaleLinear()
        // domain needs to be opposite, since height is 0 at the top
        .domain([d3.max(allData, d => d[yVar]),0])
        .range([0, height]);

    const yAxis = d3.axisLeft(yScale)
        .tickFormat((d) => d3.format(".2s")(d)) // Format ticks as 1k, 1M, etc.
       
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,0)`) // Position at the left
        .call(yAxis);
    
    sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(allData, d => d[sizeVar])]) // Largest bubble = largest data point 
        .range([5, 20]); // Feel free to tweak these values if you want bigger or smaller bubbles
    
    // X-axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 20)
        .attr("text-anchor", "middle")
        .text(xVar) // Displays the current x-axis variable
        .attr('class', 'labels')

    // Y-axis label (rotated)
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 40)
        .attr("text-anchor", "middle")
        .text(yVar) // Displays the current y-axis variable
        .attr('class', 'labels')
// Your turn: Create the y-axis using the same approach.
// Use d3.scaleLinear() again.
// Adjust .domain(), .range(), and the .attr("transform", ...) to position it on the left.
}

function updateVis(){
    // Filter data for the current year
    let currentData = allData.filter(d => d.year === targetYear)

    svg.selectAll('.points')
        // Why use d => d.country as the key?
        // Because each country is unique in the dataset for the current year. 
        // This helps D3 know which bubbles to keep, update, or remove.
        .data(currentData, d => d.country)
        .join(
             // When we have new data points
            function(enter){
                return enter
                .append('circle')
                .attr('class', 'points')
                .attr('cx', d => xScale(d[xVar])) // Position on x-axis
                .attr('cy', d => yScale(d[yVar])) // Position on y-axis
                .attr('r', 0) // Bubble Size before transition r = 0
                .style('fill', d => colorScale(d.continent))  // Default color for now
                .style('opacity', .5) // Slight transparency for better visibility
                .on('mouseover', function (event, d) {
                    console.log(d) // See the data point in the console for debugging
                    d3.select('#tooltip')
                         // if you change opacity to hide it, you should also change opacity here
                        .style("display", 'block') // Make the tooltip visible
                        .html( // Change the html content of the <div> directly
                        `<strong>${d.country}</strong><br/>
                        Continent: ${d.continent}`)
                        .style("left", (event.pageX + 20) + "px")
                        .style("top", (event.pageY - 28) + "px");

                    d3.select(this) // Refers to the hovered circle
                        .style('stroke', 'black')
                        .style('stroke-width', '4px')
                })
                .on("mouseout", function (event, d) {
                    d3.select('#tooltip')
                      .style('display', 'none') // Hide tooltip when cursor leaves
                    
                    d3.select(this) // Refers to the hovered circle
                        .style('stroke-width', '0px')
                })
                .transition(t) // Animate the transition
                .attr('r', d => sizeScale(d[sizeVar])) // Expand to target size
            },
            function(update){
                return update
                .transition(t) // Animate the transition
                .attr('cx', d => xScale(d[xVar]))
                .attr('cy', d => yScale(d[yVar]))
                .attr('r',  d => sizeScale(d[sizeVar]))
            },
            function(exit){
                exit
                .transition(t)
                .attr('r', 0)  // Shrink to radius 0
                .remove()
            }
        )
}

function addLegend(){
    let size = 10  // Size of the legend squares

    // Your turn, draw a set of rectangles using D3
    svg.selectAll('continentSquare')
        .data(continents)
        .join(
            function(enter){
                return enter
                .append('rect')
                .attr('x', (d, i) => i * (size + 100) + 100) // Position the squares x
                .attr('y', -margin.top/2) // Position the squares y
                .attr('width', size) // Size of the squares
                .attr('height', size) // Size of the squares
                .style('fill', d => colorScale(d)) // Fill with the color
            })
    
    svg.selectAll("continentName")
        .data(continents)
        .enter()
        .append("text")
        .attr("y", -margin.top/2 + size) // Align vertically with the square
        .attr("x", (d, i) => i * (size + 100) + 120)  
        .style("fill", d => colorScale(d))  // Match text color to the square
        .text(d => d) // The actual continent name
        .attr("text-anchor", "left")
        .style('font-size', '13px')
    }
    // data here should be "continents", which we've defined as a global variable
    // the rect's y could be  -margin.top/2, x could be based on i * (size + 100) + 100
    // i is the index in the continents array
    // use "colorScale" to fill them; colorScale is a global variable we defined, used in coloring bubbles
   


window.addEventListener('load', init);
