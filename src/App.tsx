import React, { useState, MouseEvent, useRef, TouchEvent, useEffect, useCallback, RefObject, useLayoutEffect } from "react";
import circle from "./assets/ellipse-outline.svg";
import square from "./assets/square-outline.svg";
import line from "./assets/line.svg";
import eraser from "./assets/eraser.svg";
import deleteIcon from "./assets/delete.svg";
import arrowIcon from "./assets/arrow.svg";

interface CanvasElementsProps {
  x: number,
  y: number,
  type: string,
  width: number,
  height: number,
  strokeWidth: number,
  stroke: string,
  fill: boolean,
  fillColor: string,
  rotation: number,
  updatedAt: number,
};

type AppStateProps = {
  zoom: number,
  offset: {
    x: number,
    y: number
  },
}
function DrawingBoard() {
  const toolList = ["selection", "rectangle", "circle", "line", "eraser"];

  const [selectedElement, setSelectedElement] = useState<number>(-1)
  const [isDrag, setIsDrag] = useState(false);
  // const [isResizeDrag, setIsResizeDrag] = useState(false);

  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<CanvasElementsProps[]>(JSON.parse(localStorage.getItem("drawingApp") || "[]"));
  const [tool, setTool] = useState<number>(1);
  const [toolProps, setToolProps] = useState({ strokeWidth: 3, stroke: "#000000", fill: false, fillColor: "#658afe" });
  const [recordCanvasState, setRecordCanvasState] = useState<boolean>(false);

  //
  //Creating ghost canvas for selection and resizing the canvas objects
  //

  var ghostCanvas: HTMLCanvasElement | null = null,
    gctx: CanvasRenderingContext2D;
  const canvas = useRef<HTMLCanvasElement>(null);
  var ctx = canvas.current?.getContext("2d") as CanvasRenderingContext2D;

  function initGhostCanvas() {
    if (!canvas.current) console.log("nah!!!!");
    ghostCanvas = document.createElement('canvas');
    ghostCanvas.width = canvas.current!.width;
    ghostCanvas.height = canvas.current!.height;
    gctx = ghostCanvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  }
  const drawCanvas = () => {
    if (canvas.current) {
      localStorage.setItem("drawingApp", JSON.stringify(elements));
      ctx = canvas.current.getContext("2d") as CanvasRenderingContext2D;
      ctx.lineCap = "round";
      ctx.clearRect(0, 0, canvas.current!.width, canvas.current!.height);
      if (ghostCanvas == null) {
        initGhostCanvas();
      }
      // Changing canvas bg to white for recording of the canvas to be non transparent
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.current!.width, canvas.current!.height);
      ctx.save();
      ctx.scale(zoom, zoom);
      // ctx.translate(panOffset.x * zoom, panOffset.y * zoom);
      const translateX = panOffset.x + (zoomOffset.x * (1 - zoom)) / zoom;
      const translateY = panOffset.y + (zoomOffset.y * (1 - zoom)) / zoom;
      ctx.translate(translateX, translateY);

      ctx.strokeStyle = "#000000"
      elements.forEach((element) => {
        drawShapeOnCanvas(ctx, element)
      });
      ctx.restore();
    }
  }

  const zoomCanvas = (deltaY: number) => {
    setZoom(prevState => Math.max(Math.min(prevState + deltaY, 5), 0.2));
  }

  const drawShapeOnCanvas = (ctx: CanvasRenderingContext2D, props: CanvasElementsProps) => {
    let { x, y, type, width, height, strokeWidth, fill, fillColor, stroke } = props;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth * zoom;
    ctx.lineCap = "round";
    ctx.fillStyle = fillColor;
    if (ctx === gctx)
      ctx.lineWidth = strokeWidth + 4;
    if (type === "rectangle") {
      if (fill === true) {
        ctx.fillRect(x, y, width, height);
      }
      ctx.strokeRect(x, y, width, height);
    } else if (type === "circle") {
      const radius = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.stroke();
      if (fill) ctx.fill();
    } else if (type === "line") {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(width + x, height + y);
      ctx.stroke();
    }
  }

  useEffect(() => {
    canvas.current?.addEventListener("wheel", (e) => handleScroll(e), { passive: false })
    return () => {
      canvas.current?.removeEventListener("wheel", handleScroll);
    }
  }, [])

  useEffect(() => {
    drawCanvas();
  }, [elements, zoom, panOffset])

  const clearContext = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, canvas.current!.width, canvas.current!.height);
  }
  const getMouseCoordinates = (event: MouseEvent) => {
    const clientX = (event.clientX - panOffset.x + (zoomOffset.x * (1 - zoom)) / zoom);
    const clientY = (event.clientY - panOffset.y + (zoomOffset.y * (1 - zoom)) / zoom)
    console.log({ clientX, clientY, a: event.clientX, b: event.clientY })
    return { clientX, clientY };
  };
  const handleMouseDown = (event: MouseEvent) => {
    const { clientX, clientY } = getMouseCoordinates(event);
    if (tool == 0) {

      if (!ghostCanvas) {
        initGhostCanvas();
      }

      gctx.save();
      gctx.strokeStyle = "#ff0000"
      for (var i = elements.length - 1; i >= 0; i--) {
        drawShapeOnCanvas(gctx, elements[i]);
        var imgData = gctx.getImageData(clientX, clientY, 1, 1);

        if (imgData.data[3] > 0) {
          setIsDrag(true);
          setSelectedElement(i);
          gctx.restore();
          // clearContext(gctx);
          return;
        }
      }
      setSelectedElement(-1);
      gctx.restore();
      clearContext(gctx);
    } else {
      setIsDrawing(true);
      const element = {
        x: clientX,
        y: clientY,
        type: toolList[tool],
        width: 0,
        height: 0,
        strokeWidth: toolProps.strokeWidth,
        stroke: toolProps.stroke,
        fill: toolProps.fill,
        fillColor: toolProps.fillColor,
        rotation: 0,
        updatedAt: Date.now()
      };
      setElements(prevElements => [...prevElements, element])
    }
  }
  const handleMouseMove = (event: MouseEvent) => {
    const { clientX, clientY } = getMouseCoordinates(event);
    if (isDrawing) {

      const index = elements.length - 1;
      const { x, y } = elements[index];
      const newElement = {
        x,
        y,
        type: toolList[tool],
        width: clientX - x,
        height: clientY - y,
        strokeWidth: toolProps.strokeWidth,
        stroke: toolProps.stroke,
        fill: toolProps.fill,
        fillColor: toolProps.fillColor,
        rotation: 0,
        updatedAt: Date.now()
      };

      const elementsClone = [...elements];
      elementsClone[index] = newElement;
      setElements(elementsClone);

    } else if (isDrag) {

      const { type, stroke, strokeWidth, fill, fillColor, rotation, width, height } = elements[selectedElement];
      const newElement = {
        x: clientX,
        y: clientY,
        type,
        width,
        height,
        strokeWidth,
        stroke,
        fillColor,
        fill,
        rotation,
        updatedAt: Date.now()
      }
      const elementsClone = [...elements];
      elementsClone[selectedElement] = newElement;
      setElements(elementsClone);
    }
  }
  const handleMouseUp = (_event: MouseEvent) => {
    setIsDrawing(false);
    setIsDrag(false);
  }


  const handleTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    const { clientX, clientY } = e.touches[0];
    if (tool == 0) {

      if (!ghostCanvas) {
        initGhostCanvas();
      }

      gctx.save();
      gctx.scale(zoom, zoom);
      gctx.translate(panOffset.x / zoom, panOffset.y / zoom);
      for (var i = elements.length - 1; i >= 0; i--) {
        drawShapeOnCanvas(gctx, elements[i]);
        var imgData = gctx.getImageData(clientX, clientY, 1, 1);

        if (imgData.data[3] > 0) {
          setIsDrag(true);
          setSelectedElement(i);
          clearContext(gctx);
          return;
        }
      }
      gctx.restore();
      setSelectedElement(-1);
      clearContext(gctx);
    } else {
      setIsDrawing(true);
      const element = {
        x: clientX,
        y: clientY,
        type: toolList[tool],
        width: 0,
        height: 0,
        strokeWidth: toolProps.strokeWidth,
        stroke: toolProps.stroke,
        fill: toolProps.fill,
        fillColor: toolProps.fillColor,
        rotation: 0,
        updatedAt: Date.now()
      };
      setElements(prevElements => [...prevElements, element])
    }
  }
  const handleTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
    const { clientX, clientY } = e.touches[0];
    if (isDrawing) {

      const index = elements.length - 1;
      const { x, y } = elements[index];
      const newElement = {
        x,
        y,
        type: toolList[tool],
        width: clientX - x,
        height: clientY - y,
        strokeWidth: toolProps.strokeWidth,
        stroke: toolProps.stroke,
        fill: toolProps.fill,
        fillColor: toolProps.fillColor,
        rotation: 0,
        updatedAt: Date.now()
      };

      const elementsClone = [...elements];
      elementsClone[index] = newElement;
      setElements(elementsClone);

    } else if (isDrag) {

      const { type, stroke, strokeWidth, fill, fillColor, rotation, width, height } = elements[selectedElement];
      const newElement = {
        x: clientX,
        y: clientY,
        type,
        width,
        height,
        strokeWidth,
        stroke,
        fillColor,
        fill,
        rotation,
        updatedAt: Date.now()
      }
      const elementsClone = [...elements];
      elementsClone[selectedElement] = newElement;
      setElements(elementsClone);
    }
  }
  const handleTouchUp = (_e: TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    setIsDrag(false);
  }

  const handleScroll = (e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey === true) {
      zoomCanvas(e.deltaY * -0.01);
      // console.log(e)
      setZoomOffset({ x: e.clientX, y: e.clientY });
    } else {
      setPanOffset(prevState => {
        return { x: (prevState.x - e.deltaX), y: (prevState.y - e.deltaY) }
      }
      );
    }
  }

  const handleToolClick = (toolNum: number) => {
    setTool(toolNum);
    var tools = document.querySelectorAll(".tool-icon");
    tools.forEach(tool => tool.classList.remove("selected"));
    tools[toolNum].classList.add("selected");
  }


  return (
    <>
      <ul className="tools">
        <li><button className={"tool-icon"} onClick={() => handleToolClick(0)}><img src={arrowIcon} width={20} height={20} /></button></li>
        <li><button className={"tool-icon"} onClick={() => handleToolClick(1)}><img src={square} width={20} height={20} /></button></li>
        <li><button className={"tool-icon"} onClick={() => handleToolClick(2)}><img src={circle} width={20} height={20} /></button></li>
        <li><button className={"tool-icon"} onClick={() => handleToolClick(3)}><img src={line} width={20} height={20} /></button></li>
        <li><button className={"tool-icon"} onClick={() => handleToolClick(4)}><img src={eraser} width={20} height={20} /></button></li>
        <li><button className={"tool-icon"} onClick={() => setElements([])}><img src={deleteIcon} width={20} height={20} /></button></li>
      </ul>
      <ul style={{ marginTop: "40px", position: "absolute" }}>
        <li>
          <input
            type="color"
            value={toolProps.stroke}

            onChange={(e) => setToolProps((prevProps) => {
              return {
                ...prevProps,
                stroke: e.target.value
              }
            })}
          /><label>Stroke color</label>
          <br />
          <input
            min={1}
            max={5}
            step={2}
            type="number"
            value={toolProps.strokeWidth}
            onChange={(e) => {
              setToolProps((prevProps) => {
                return {
                  ...prevProps,
                  strokeWidth: parseInt(e.target.value)
                }
              })
            }
            } /><label>Stroke width</label>
        </li>
        <li><label>
          <input
            type="checkbox"
            title="fill"
            checked={toolProps.fill}
            onChange={(e) => {
              setToolProps((prevProps) => {
                return {
                  ...prevProps,
                  fill: e.target.checked
                }
              })
            }
            } />Fill</label>
        </li>
        <li>
          <input
            type="color"
            value={toolProps.fillColor}
            onChange={(e) => {
              setToolProps((prevProps) => {
                return {
                  ...prevProps,
                  fillColor: e.target.value,
                }
              })
            }
            } /> <label>Fill Color</label>
        </li>
        <li>
          <span onClick={() => {
            setZoom(1)
            setZoomOffset({ x: 0, y: 0 })
          }}>
            {new Intl.NumberFormat("en-US", { style: "percent" }).format(zoom)}
          </span>
          <span>
            {JSON.stringify(panOffset)}
          </span>
        </li>
      </ul>

      {true && <VideoRecordingComponent canvasRef={canvas} recordCanvasState={recordCanvasState} setRecordCanvasState={setRecordCanvasState} />}
      <canvas
        ref={canvas}
        id="canvas"
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={(e) => handleMouseDown(e)}
        onMouseUp={(e) => handleMouseUp(e)}
        onMouseMove={(e) => handleMouseMove(e)}
        onMouseOut={(e) => handleMouseUp(e)}
        onTouchStart={(e) => handleTouchStart(e)}
        onTouchEnd={(e) => handleTouchUp(e)}
        onTouchMove={(e) => handleTouchMove(e)}
        onTouchCancel={(e) => handleTouchUp(e)}
      >
        Drawing Canvas
      </canvas>
    </>);
}
type VideoComponentProps = {
  canvasRef: RefObject<HTMLCanvasElement>,
  recordCanvasState: boolean,
  setRecordCanvasState: React.Dispatch<React.SetStateAction<boolean>>
}

const VideoRecordingComponent = ({ canvasRef, recordCanvasState, setRecordCanvasState }: VideoComponentProps) => {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder>();
  const chunks = useRef<Blob[]>([]);
  const [videoURL, setVideoURL] = useState<string>();
  const canvas = canvasRef.current;
  useEffect(() => {
    let videoStream: MediaStream | null = null;
    let mediaRecorderNew: MediaRecorder | null = null;

    const handleStop = (_e: Event) => {
      const blobOfChunks = new Blob(chunks.current, { 'type': 'video/webm;codecs=h264' });
      const videoURI = URL.createObjectURL(blobOfChunks);
      console.log({ videoURI, chunks });

      setVideoURL(videoURI);
    };

    const handleDataAvailable = (e: BlobEvent) => {
      console.log(e.data);
      chunks.current = [e.data];
    };

    if (canvas) {
      videoStream = canvas.captureStream(60);
      mediaRecorderNew = new MediaRecorder(videoStream);
      mediaRecorderNew.ondataavailable = handleDataAvailable;
      mediaRecorderNew.onstop = handleStop;
      setMediaRecorder(mediaRecorderNew)
    }
    return () => {
      if (mediaRecorderNew && mediaRecorderNew.state == "recording") {
        mediaRecorderNew.stop()
      }
    };

  }, [canvas])

  // useEffect(() => {
  //   const streamer = document.getElementById("videoStreamer") as HTMLVideoElement;
  //   streamer.load();
  // }, [videoURL])

  const recordCanvas = useCallback(() => {
    if (mediaRecorder) {
      console.log("part1");
      mediaRecorder.start();
      setRecordCanvasState(prevState => !prevState);
    }
  }, [mediaRecorder, recordCanvasState]);
  const stopRecording = useCallback(() => {
    if (mediaRecorder) {
      console.log("part2");
      mediaRecorder.stop();
      setRecordCanvasState(prevState => !prevState);
    }
  }, [mediaRecorder, recordCanvasState]);
  return (
    <div id="videoPlayer">
      <button className={"tool-icon"} onClick={!recordCanvasState ? recordCanvas : stopRecording}>{!recordCanvasState ? "StartRecording" : "StopRecording"}</button>
      {chunks.current.length > 0 ? <a href={videoURL} download={"file.webm"}>DOWNLOAD VIDEO</a> : <></>}
    </div>
  )
}

export default DrawingBoard;
