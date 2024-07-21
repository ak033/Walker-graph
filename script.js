document.addEventListener('DOMContentLoaded', function() {
    // Initialize the Plotly graphs with empty data
    var traceLeft = {
        x: [],
        y: [],
        mode: 'lines',
        name: 'Left',
        line: { color: 'orange' }
    };

    var traceRight = {
        x: [],
        y: [],
        mode: 'lines',
        name: 'Right',
        line: { color: 'blue' }
    };

    var layoutLeft = {
        title: 'Real-time Left Forces',
        xaxis: { title: 'Time (seconds)' },
        yaxis: { title: 'Force (Newtons)' }
    };

    var layoutCombined = {
        title: 'Real-time Combined Left and Right Forces',
        xaxis: { title: 'Time (seconds)' },
        yaxis: { title: 'Force (Newtons)' }
    };

    var layoutRight = {
        title: 'Real-time Right Forces',
        xaxis: { title: 'Time (seconds)' },
        yaxis: { title: 'Force (Newtons)' }
    };

    Plotly.newPlot('leftGraph', [traceLeft], layoutLeft);
    Plotly.newPlot('combinedGraph', [traceLeft, traceRight], layoutCombined);
    Plotly.newPlot('rightGraph', [traceRight], layoutRight);

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
            time += 1;
            const values = data.replace("Random values: ", "").split(',');

            if (values.length >= 2) {
                var newLeftData = parseFloat(values[0].trim());
                var newRightData = parseFloat(values[1].trim());

                console.log(`Parsed values - Left: ${newLeftData}, Right: ${newRightData}`);

                if (isNaN(newLeftData)) {
                    console.error('Left data is NaN:', values[0]);
                }
                if (isNaN(newRightData)) {
                    console.error('Right data is NaN:', values[1]);
                }

                var updateLeft = {
                    x: [[time]],
                    y: [[newLeftData]]
                };

                var updateRight = {
                    x: [[time]],
                    y: [[newRightData]]
                };

                // Update the left graph with left data
                Plotly.extendTraces('leftGraph', updateLeft, [0]);

                // Update the right graph with right data
                Plotly.extendTraces('rightGraph', updateRight, [0]);

                // Update the combined graph with both left and right data
                Plotly.extendTraces('combinedGraph', {
                    x: [[time], [time]],
                    y: [[newLeftData], [newRightData]]
                }, [0, 1]);

                var olderTime = time - 50;
                if (time > 50) {
                    var range = { 'xaxis.range': [olderTime, time] };
                    Plotly.relayout('leftGraph', range);
                    Plotly.relayout('rightGraph', range);
                    Plotly.relayout('combinedGraph', range);
                }
            }
        }
    }
});
