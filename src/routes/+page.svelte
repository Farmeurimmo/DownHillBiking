<script>
    import {dark} from "../store.js"; // dark mode store
    import AppearanceToggler from "../libs/AppearanceToggler.svelte";
    import {onMount} from "svelte";

    let circuitsData = [];

    let isConnectedToBluetooth = false;


    onMount(async () => {
        const response = await fetch("circuits.json");
        const data = await response.json();
        circuitsData = Object.values(data); // Convert the object to an array

        console.log(circuitsData);

        setTimeout(() => {

            if (!navigator.bluetooth) {
                console.error('Web Bluetooth API is not available in this browser.');
                return;
            }

            let buttonSearchForDevices = document.getElementById('search-for-devices');
            if (buttonSearchForDevices) {
                console.log("adding event")
                buttonSearchForDevices.addEventListener('pointerup', async () => {
                    const result = await navigator.bluetooth.requestDevice({acceptAllDevices: true}).then(device => {
                        console.log(device);
                        device.addEventListener('gattserverdisconnected', () => {
                            isConnectedToBluetooth = false;
                        });
                        return device.gatt.connect();
                    }).then(async () => {
                        isConnectedToBluetooth = true;

                        if (!navigator.serial) {
                            console.log("navigator.serial is not available");
                            return;
                        }

                        //open a port to 9600
                        let port = await navigator.serial.requestPort();
                        await console.log(port);
                        console.log("trying to open port...")
                        await port.open({baudRate: 9600});
                        console.log("port opened")

                        const reader = port.readable.getReader();

                        while (true) {
                            const {value, done} = await reader.read();
                            if (done) {
                                reader.releaseLock();
                                break;
                            }
                            console.log(value);
                        }
                    }).catch(error => {
                        isConnectedToBluetooth = false;
                        return error;
                    });
                    console.log(result);
                });
            }
            let buttonDisconnect = document.getElementById('disconnect');
            if (buttonDisconnect) {
                buttonDisconnect.addEventListener('pointerup', async () => {
                    const result = await navigator.bluetooth.getDevices().then(devices => {
                        devices.forEach(device => {
                            device.gatt.disconnect();
                        });
                    }).then(() => {
                        isConnectedToBluetooth = false;
                    }).catch(error => {
                        isConnectedToBluetooth = true;
                        return error;
                    });
                    console.log(result);
                });
            }
        }, 1_000);
    });

    var port;
    var lineBuffer = '';

    async function getReader() {
        var port = await navigator.serial.requestPort({});
        await port.open({baudRate: 9600});
        const appendStream = new WritableStream({
            write(chunk) {
                lineBuffer += chunk;
                var lines = lineBuffer.split('\n');
                while (lines.length > 1) {
                    var message = lines.shift();
                    //split in 3 parts at the | character
                    var parts = message.split("|");
                    updateCursorPosition3(parts[0]);
                    document.getElementById("info").innerHTML = message;
                }
                lineBuffer = lines.pop();
                isConnectedToBluetooth = true;
            }
        });
        port.readable
            .pipeThrough(new TextDecoderStream())
            .pipeTo(appendStream);
    }

    function listSerial() {
        if (port) {
            isConnectedToBluetooth = false;
            port.close();
            port = undefined;
        } else {
            console.log("Look for Serial Port")
            getReader();
        }
    }

    let selectedCircuit = {};
    let waitingForCircuit = true;
    let videoElement = null;

    function startCircuit(circuit) {
        console.log(circuit);

        videoElement = document.querySelector('video');
        points = {};
        updateCursorPosition(0);
        updateCursorPosition2(0);

        selectedCircuit = JSON.stringify(circuit);
        waitingForCircuit = false;

        // for each point in points, parse it and add it in function of the "time"
        // then, when the video is playing, we will update the cursor position
        // with the value of the point at the current time
        for (let i = 0; i < circuit.points.length; i++) {
            let time = circuit.points[i].time;
            let effX = circuit.points[i].effX;
            let effY = circuit.points[i].effY;
            points[i] = {time, effX, effY};
        }

        let interval = setInterval(() => {
            if (waitingForCircuit === true) {
                clearInterval(interval);
                return;
            }
            //randomly update it between -90 and 90
            //let random = Math.floor(Math.random() * 180);
            //updateCursorPosition2(random);
            setTimeout(() => {
                //updateCursorPosition(random);
            }, 700);
        }, 1000);

        setTimeout(() => {
            let currentPosition = 0;

            videoElement = document.querySelector('video');
            videoElement.addEventListener('play', () => {
                if (!running && startTime === 0) {
                    running = true;
                    startTime = Date.now();
                    currentPosition = 0;

                    //schedule the update of the cursor 1 (the current effort), the cursor 2 (next effort to do)
                    let interval = setInterval(() => {
                        if (!running) {
                            clearInterval(interval);
                            return;
                        }
                        if (waitingForCircuit === true) {
                            clearInterval(interval);
                            return;
                        }

                        //there is a point every 0.5s of time
                        let currentTime = Date.now();
                        let timeDiff = currentTime - startTime;
                        if (timeDiff >= 495) {
                            currentPosition++;
                            startTime = currentTime;
                        }

                        let currentPoint = points[currentPosition];
                        let nextPoint = points[currentPosition + 1];

                        if (currentPoint) {
                            updateCursorPosition(currentPoint.effY);
                        }
                        if (nextPoint) {
                            updateCursorPosition2(nextPoint.effY);
                        }
                    }, 5);
                }
            });
            videoElement.addEventListener('ended', () => {
                running = false;
                startTime = 0;
            });

            setInterval(() => {
                if (document !== undefined) {
                    let videoElement = document.querySelector('video');
                    if (videoElement) {
                        if (isConnectedToBluetooth) {
                            if (videoElement.paused) {
                                videoElement.play();
                            }
                        } else {
                            videoElement.pause();
                        }
                    }
                }
            }, 100);
        }, 1_000);
    }

    let cursorPosition = 0;
    let cursorPosition2 = 0;
    let cursorPosition3 = 0;
    const multiplier = 4.58;
    let points = {};

    function updateCursorPosition(angle) {
        cursorPosition = angle * multiplier;
    }

    function updateCursorPosition2(angle) {
        cursorPosition2 = angle * multiplier;
    }

    function updateCursorPosition3(angle) {
        cursorPosition3 = angle * multiplier * 2 + 45 * multiplier;
    }

    let running = false;
    let startTime = 0;

    const videoUrl = './circuit_demo.mp4';
    const posterUrl = 'https://www.lofficiel.net/img/guide_photo/2671409-circuit-vtt-n5-vert-foret-de-la-rousse-bois-de-valuisant-sebastien-tournier-fiche.jpg'
</script>

<main
        class="bg-gradient-to-br min-h-screen flex items-center justify-center"
        class:dark
        class:from-blue-700={$dark}
        class:from-yellow-200={!$dark}
        class:to-pink-300={!$dark}
        class:to-purple-800={$dark}
>
    {#if waitingForCircuit}
        <div class="flex flex-col items-center space-y-8 p-4">
            <h1 class="hello leading-tight">Downhill Biking</h1>

            <p class="text-xl">Ensuite, sélectionnez un circuit parmit ceux ci dessous</p>
            <div class="grid grid-cols-3 gap-2">
                {#if circuitsData.length > 0}
                    {#each circuitsData as circuit}
                        <button class="bg-gray-900 hover:bg-blue-700 text-white font-bold py-2 rounded-2xl gap-2 transition
                    duration-500 ease-in-out transform hover:-translate-y-1 focus:outline-black focus:bg-blue-700"
                                on:click={() => startCircuit(circuit)}>
                            <span class="text-4xl font-bold">{circuit.name}</span>
                            <img src={circuit.imgsrc} alt="circuit"/>
                            <span class="text-lg mt-4 px-2">{circuit.description}</span>
                        </button>
                    {/each}
                {:else}
                    <p>Loading circuits...</p>
                {/if}
            </div>
        </div>
    {:else}
        <div class="min-h-screen w-full">
            <button class="fixed bottom-2 right-40 bg-gray-800 hover:bg-gray-700 text-white font-bold p-4 rounded-2xl gap-2 transition
                    duration-500 ease-in-out transform hover:-translate-y-1 focus:outline-black focus:bg-blue-700"
                    on:click={() => waitingForCircuit = true}>
                <span class="text-4xl font-bold">Retour</span>
            </button>
            <div class="grid grid-cols-2 bg-gray-900">
                <div class="grid grid-cols-2 mb-5">
                    <div class="flex flex-col items-end gap-5">
                        {#each Array(7) as _, index (index)}
                            <div class="text-5xl items-center gap-5 flex flex-row">
                                <p class="text-white">{index * 15 - 45}</p>
                                <span class={`flex h-1 w-40 ${index % 2 === 0 ? 'bg-yellow-400 h-2' : 'bg-yellow-600'}`}></span>
                            </div>
                        {/each}
                    </div>
                    <div class="flex flex-col">
                        <div id="cursor" class="h-12 absolute z-50" style="top: {cursorPosition}px;">
                            <div class="arrow-left"></div>
                        </div>
                        <div id="cursor2" class="h-12 absolute z-0" style="top: {cursorPosition2}px;">
                            <div class="arrow-left"></div>
                        </div>
                        <div id="cursor3" class="h-12 absolute z-0" style="top: {cursorPosition3}px;">
                            <div class="arrow-left"></div>
                        </div>
                    </div>
                </div>
                <div class="w-full">
                    <p>Lecteur vidéo</p>
                    <video poster={posterUrl} class="w-full">
                        <source src={videoUrl} type="video/mp4"/>
                        Your browser does not support the video tag.
                        <track kind="captions" src="captions_en.vtt" srclang="en" label="English"/>
                    </video>
                </div>
            </div>
            <div class="p-5">
                <p class="text-3xl">{isConnectedToBluetooth ? 'Connecté' : 'Déconnecté, merci de connecter la carte Arduino en bluetooth'}</p>

                <button on:click={listSerial}
                        class="{!isConnectedToBluetooth ? 'bg-blue-900 hover:bg-blue-700' : 'bg-red-700 hover:bg-red-600'} text-white font-bold p-4 rounded-2xl gap-2 transition
                    duration-500 ease-in-out transform hover:-translate-y-1 focus:outline-black m-4">{!isConnectedToBluetooth ? 'Connecter' : 'Déconnecter'}</button>
                <div id="info" class="text-2xl"></div>

                <p class="mt-5"/>
                <h2 class="text-2xl">Légende des flèches</h2>
                <div class="grid grid-cols-2 gap-2">
                    <div class="flex flex-row items-center gap-2">
                        <div class="h-12 w-12 bg-blue-500 text-2xl"></div>
                        <p>Prochain effort</p>
                    </div>
                    <div class="flex flex-row items-center gap-2">
                        <div class="h-12 w-12 bg-red-500 text-2xl"></div>
                        <p>Effort à produire</p>
                    </div>
                    <div class="flex flex-row items-center gap-2">
                        <div class="h-12 w-12 bg-green-500 text-2xl"></div>
                        <p>Effort actuel</p>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <AppearanceToggler/>
</main>

<style>
    main {
        text-align: center;
        margin: 0 auto;
    }

    #cursor2 .arrow-left {
        width: 0;
        height: 0;
        border-top: 20px solid transparent;
        border-bottom: 25px solid transparent;
        border-right: 25px solid blue;
    }

    #cursor .arrow-left {
        width: 0;
        height: 0;
        border-top: 20px solid transparent;
        border-bottom: 20px solid transparent;
        border-right: 20px solid red;
    }

    #cursor3 .arrow-left {
        width: 0;
        height: 0;
        border-top: 20px solid transparent;
        border-bottom: 20px solid transparent;
        border-right: 20px solid green;
    }

    #cursor, #cursor2, #cursor3 {
        transition: top 0.3s ease;
    }

    @media (min-width: 640px) {
        main {
            max-width: none;
        }
    }
</style>
