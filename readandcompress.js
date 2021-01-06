

window.onload = e =>
{

    let btnfile = document.querySelectorAll('input[type="file"]')[0],
        ConvertNow = document.getElementById('ConvertNow');

    ConvertNow.onclick = eventfiles => { console.log('Get File...',btnfile.files[0]); GetAndAnalyzeFile(btnfile.files[0]) };

    
    /// FIRST... GET FILE IN CHUNKS
   
    function GetAndAnalyzeFile(VIDEOFILE)
    {

            console.log('Analizing File...');

            document.getElementById('videolink').href=null;
            document.getElementById('videotest').src=null;
            document.getElementById('videotest').srcObject=null;
            

            let bar            = document.querySelectorAll('.messagebar')[0],
                fileextension  = (VIDEOFILE.name.slice(VIDEOFILE.name.lastIndexOf('.') + 1)).toLowerCase(),
                GETURL         = window.URL || window.webkitURL,
                fileReader     = new FileReader(),
                fileChunks     = [],
                fileChunkSize  = 64*1024,
                chunkstep      = 0,
                fileurl,
                errors;


            ( readchunks = () => {

                console.log('Reading File...');

                let nextcut        = fileChunkSize+chunkstep,
                    filecut        = VIDEOFILE.slice(chunkstep, nextcut);

                fileReader.readAsBinaryString(filecut);

                let blob = new Blob([VIDEOFILE]),
                    bloburl = GETURL.createObjectURL(VIDEOFILE);

                fileReader.onload = fileloading =>
                {


                    let percentLoaded = parseInt( ((chunkstep / VIDEOFILE.size) * 100), 10 );
                    bar.innerHTML = percentLoaded+'%';


                    if (fileloading.target.result.length==0)
                    {
                        bar.innerHTML = '100% - file loaded';
                        readend(fileReader,fileChunks,VIDEOFILE,errors);
                    }

                    else
                    {
                        if (fileloading.target.error == null)
                        {
                            fileChunks.push(fileloading.target.result);
                            chunkstep += fileloading.target.result.length;
                            readchunks(chunkstep,fileChunkSize,VIDEOFILE);
                        }
                        else
                        {
                            fileReader.oncrash(fileloading.target.error)
                        }
                    }



                    function readend(fileReader,fileChunks,VIDEOFILE)
                    {


                        let isvideo = ['mp4','f4v','mpeg','m4v','mov','webm','ogv'].includes(fileextension);

                        if(isvideo)
                        {


                            let maxw     = parseInt( document.getElementById('maxWidth').value ),
                                maxh     = parseInt( document.getElementById('maxHeight').value ),
                                fps      = parseInt( document.getElementById('fps').value ),
                                downrate = parseInt( document.getElementById('downrate').value );

                            ////
                            //// LOUNCH VIDEO RECORDING AND OPTIMIZING
                            ////

                            videooptimizer(
                            bloburl,'video/mp4',maxw,maxh,fps,downrate,
                            optimized => {
                                if(optimized){ console.log('conversion end', newFileCompressedUrl)}
                                else{ alert("Video compressor fail. No optimized blob on end.")}
                            });

                        }

                        else { console.log('THIS IS DEMO, ONLY VIDEO PLEASE. TRY TO USE MP4.'); }



                        function clearstepmem()
                        {
                            fileChunks=[]; event_encodedloaded=null; reader=null; canvas=null; projector=null; sound=null; URL.revokeObjectURL(GETURL);
                        }

                        
                    }

                }

                fileReader.onabort = (errors) => { debug(`:: [⚠ viƨor alert]: uploader error\n   ⮑ critical error/abort: reader crash on loading.\n      reader message:`+errors.error); printerror(errors); }
                fileReader.onerror = (errors) => { debug(`:: [⚠ viƨor alert]: uploader error\n   ⮑ critical error/abort: reader crash on loading.\n      reader message:`+errors.error); printerror(errors); }
                fileReader.oncrash = (errors) => { debug(`:: [⚠ viƨor alert]: uploader error\n   ⮑ critical error/abort: reader crash on loading.\n      reader message:`+errors.error); printerror(errors); }


                function resetbar(bar) { setTimeout(()=>{ bar.innerHTML = 'wainting file selection';},500) }
                function printerror(errors){ bar.innerHTML = errors}


            })(chunkstep,fileChunkSize,VIDEOFILE);




            //
            //
            // THE OPTIMIZER
            //
            //

            function videooptimizer(videoblob,maxw,maxh,fps,downrate,optimized)
            {

                console.log('Optimizing File...');

                let virtualvideo  = document.createElement("VIDEO");

                virtualvideo.src = videoblob;
                virtualvideo.mute = true;
                virtualvideo.load();

                virtualvideo.oncanplay = event_encodedloaded =>
                {

                    document.getElementById('videolink').href=videoblob;

                    let streaming;

                    //// SET VIDEO RESIZE

                    let canvas      = document.getElementById('videotest'), //better: document.createElement("CANVAS"),
                        printer     = canvas.getContext("2d"),
                        vidw        = virtualvideo.videoWidth,
                        vidh        = virtualvideo.videoHeight;

                    if (vidw > maxw && vidw >= vidh ) { vidh = ~~(vidh *= maxw / vidw); vidw = maxw;}
                    if (vidh >= maxh) { vidw = ~~(vidw *= maxh / vidh); vidh = maxh;}

                    canvas.width = vidw;
                    canvas.height = vidh;

                    var videoresize = window.setInterval( () => { printer.drawImage(virtualvideo, 0, 0, vidw, vidh); } , 1000/ parseInt(fps) );


                    //// SET AUDIO

                    let virtualsource   = new (window.AudioContext||window.webkitAudioContext)(),
                        sourcedata      = virtualsource.createMediaElementSource(virtualvideo),
                        audiostream     = virtualsource.createMediaStreamDestination();
                    // sourcefilter    = virtualsource.createBiquadFilter(), you can mod audio whit this

                    sourcedata.connect(audiostream); // connect the source of video to the MediaStream


                    //// SET RECORDS COMPRESSION

                         if (canvas.captureStream)    { streaming = canvas.captureStream( parseInt(fps) );    }
                    else if (canvas.mozCaptureStream) { streaming = canvas.mozCaptureStream( parseInt(fps) ); }
                    else { console.error('Stream capture is not supported'); return null; }

                    /*add audio element to stream*/ streaming.addTrack( audiostream.stream.getAudioTracks()[0] );


                    let recorded = [],
                        recorder = new MediaRecorder( streaming, {
                                                      mimeType: 'video/webm',
                                                      audioBitsPerSecond: ( 1000000 / downrate ),  // 1000000 = 1 Mbps
                                                      bitsPerSecond: ( 1000000 / downrate )           // 1000000 = 2 Mbps
                                                    });

                    virtualvideo.play();


                    let saveChunks = rec =>
                    {
                      if (rec.data.size > 0){ recorded.push(rec.data); }
                    }


                    let exportVideo = exp =>
                    {

                        virtualvideo = null;
                        virtualsource = null;
                        streaming = null;
                        // canvas.remove();

                        clearInterval(videoresize);

                        let compressorblob= new Blob( recorded, { 'type' : 'video/webm' } ),
                            newFileCompressedUrl = GETURL.createObjectURL(compressorblob);

                        document.getElementById("compressedvideo").src =  newFileCompressedUrl;
                        document.getElementById("compressedvideo").controls = true;

                        if(newFileCompressedUrl){  return optimized(newFileCompressedUrl) }

                    }


                    //// START RECORDS

                    recorder.ondataavailable = saveChunks;
                    recorder.start();

                    //// STOP AND SAVE
                    virtualvideo.onended = videoend =>{ recorder.stop(); recorder.onstop = exportVideo; };


                }


            }

    }

}

