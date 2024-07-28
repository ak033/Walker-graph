document.addEventListener('DOMContentLoaded', function () {
    var traceLeft = { x: [], y: [], mode: 'lines', name: 'Left', line: { color: 'orange' } };
    var traceRight = { x: [], y: [], mode: 'lines', name: 'Right', line: { color: 'blue' } };

    var layoutLeft = { title: 'Real-time Left Forces', xaxis: { title: 'Time (seconds)' }, yaxis: { title: 'Force (Newtons)' } };
    var layoutCombined = { title: 'Real-time Combined Left and Right Forces', xaxis: { title: 'Time (seconds)' }, yaxis: { title: 'Force (Newtons)' } };
    var layoutRight = { title: 'Real-time Right Forces', xaxis: { title: 'Time (seconds)' }, yaxis: { title: 'Force (Newtons)' } };

    Plotly.newPlot('leftGraph', [traceLeft], layoutLeft);
    Plotly.newPlot('combinedGraph', [traceLeft, traceRight], layoutCombined);
    Plotly.newPlot('rightGraph', [traceRight], layoutRight);

    function createValueDisplay(elementId, title) {
        var container = document.getElementById(elementId);
        var titleElem = document.createElement('div');
        titleElem.textContent = title;
        titleElem.style.fontSize = '18px';
        titleElem.style.marginBottom = '10px';

        var valueElem = document.createElement('div');
        valueElem.id = elementId + 'Value';
        valueElem.style.fontSize = '48px';
        valueElem.style.backgroundColor = '#f0f0f0';
        valueElem.style.borderRadius = '50%';
        valueElem.style.width = '100px';
        valueElem.style.height = '100px';
        valueElem.style.display = 'flex';
        valueElem.style.alignItems = 'center';
        valueElem.style.justifyContent = 'center';
        valueElem.textContent = '0';

        container.appendChild(titleElem);
        container.appendChild(valueElem);
    }

    createValueDisplay('speedGauge', 'Speed');
    createValueDisplay('distanceGauge', 'Distance');
    createValueDisplay('stepsGauge', 'Steps');
    createValueDisplay('timeGauge', 'Time');

    let port;
    let reader;
    let isPaused = false;
    let time = 0;

    document.getElementById('connectButton').addEventListener('click', async () => {
        try {
            port = await navigator.serial.requestPort();
            await port.open({ baudRate: 115200 });
            reader = port.readable.getReader();
            console.log('Serial port opened');
            startReading();
        } catch (error) {
            console.error('Error opening serial port:', error);
        }
    });

    document.getElementById('pauseButton').addEventListener('click', () => {
        isPaused = !isPaused;
        document.getElementById('pauseButton').textContent = isPaused ? 'Resume' : 'Pause';
    });

    async function startReading() {
        let receivedData = '';
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                console.log('Read operation has been completed');
                break;
            }
            receivedData += new TextDecoder().decode(value);
            if (receivedData.includes('\n')) {
                const messages = receivedData.split('\n');
                receivedData = messages.pop();
                messages.forEach((message) => {
                    console.log('Raw message:', message);
                    updateGraph(message.trim());
                });
            }
        }
    }

    function updateGraph(data) {
        if (!isPaused) {
            const parsedData = data.match(/Random values: (\d+), (\d+), (\d+), (\d+), (\d+), (\d+)/);
            if (parsedData) {
                time += 1;
                const [_, left, right, speed, distance, steps, timeValue] = parsedData.map(Number);

                console.log(`Parsed values - Left: ${left}, Right: ${right}, Speed: ${speed}, Distance: ${distance}, Steps: ${steps}, Time: ${timeValue}`);

                var updateLeft = { x: [[timeValue]], y: [[left]] };
                var updateRight = { x: [[timeValue]], y: [[right]] };
                var updateCombined = { x: [[timeValue], [timeValue]], y: [[left], [right]] };

                Plotly.extendTraces('leftGraph', updateLeft, [0]);
                Plotly.extendTraces('rightGraph', updateRight, [0]);
                Plotly.extendTraces('combinedGraph', updateCombined, [0, 1]);

                document.getElementById('speedGaugeValue').textContent = speed;
                document.getElementById('distanceGaugeValue').textContent = distance;
                document.getElementById('stepsGaugeValue').textContent = steps;
                document.getElementById('timeGaugeValue').textContent = timeValue;

                var olderTime = timeValue - 50;
                if (timeValue > 50) {
                    var range = { 'xaxis.range': [olderTime, timeValue] };
                    Plotly.relayout('combinedGraph', range);
                    Plotly.relayout('leftGraph', range);
                    Plotly.relayout('rightGraph', range);
                }
            } else {
                console.error('Not enough data received:', data);
            }
        }
    }
});
