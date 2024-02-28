import React, { useState, MouseEvent, useRef, useEffect, useCallback, RefObject } from "react";
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

function DrawingBoard() {
  const toolList = ["selection", "rectangle", "circle", "line", "eraser"];

  const [selectedElement, setSelectedElement] = useState<number>(-1)
  const [isDrag, setIsDrag] = useState(false);
  // const [isResizeDrag, setIsResizeDrag] = useState(false);

  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<CanvasElementsProps[]>(JSON.parse(localStorage.getItem("drawingApp") || "[]"));
  const [tool, setTool] = useState<number>(0);
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
      clearContext(ctx);
      // Changing canvas bg to white for recording of the canvas to be non transparent

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.current!.width, canvas.current!.height);
      ctx.save();
      ctx.scale(zoom, zoom);

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
    ctx.lineWidth = Math.min(Math.max(strokeWidth * zoom, 1), 5);
    ctx.lineCap = "round";
    ctx.fillStyle = fillColor;

    if (type != "line") {
      if (width < 0) {
        x += width;
        width *= -1;
      }
      if (height < 0) {
        y += height;
        height *= -1;
      }
    }
    if (type === "rectangle") {
      if (fill === true) {
        ctx.fillRect(x, y, width, height);
      }
      ctx.strokeRect(x, y, width, height);
    } else if (type === "circle") {
      const radX = width / 2;
      const radY = height / 2;

      const centerX = x + radX;
      const centerY = y + radY;

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radX, radY, 0, 0, Math.PI * 2);
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
    const clientX = (event.clientX - panOffset.x * zoom + zoomOffset.x * (zoom - 1)) / zoom;
    const clientY = (event.clientY - panOffset.y * zoom + zoomOffset.y * (zoom - 1)) / zoom;

    return { clientX, clientY };
  };
  const handleMouseDown = (event: MouseEvent) => {
    const { clientX, clientY } = getMouseCoordinates(event);
    if (tool == 0) {

      if (!ghostCanvas) {
        initGhostCanvas();
      }

      gctx.scale(zoom, zoom);

      const translateX = panOffset.x + (zoomOffset.x * (1 - zoom)) / zoom;
      const translateY = panOffset.y + (zoomOffset.y * (1 - zoom)) / zoom;
      gctx.translate(translateX, translateY);
      gctx.strokeStyle = "#ff0000"
      for (var i = elements.length - 1; i >= 0; i--) {
        drawShapeOnCanvas(gctx, elements[i]);
        var imgData = gctx.getImageData(event.clientX, event.clientY, 4, 4);

        if (imgData.data[3] > 0) {
          setIsDrag(true);
          setSelectedElement(i);
          setPointer({ x: clientX, y: clientY });
          clearContext(gctx);
          return;
        }
      }
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
  const handleMouseMove = (event: MouseEvent) => {
    const { clientX, clientY } = getMouseCoordinates(event);
    if (isDrawing) {

      const index = elements.length - 1;
      let { x, y } = elements[index];
      let height = clientY - y;
      let width = clientX - x;
      if (event.shiftKey) {
        if (width > height) height = width;
        else width = height;
      }
      const newElement = {
        x,
        y,
        type: toolList[tool],
        width: width,
        height: height,
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

      const { x, y, type, stroke, strokeWidth, fill, fillColor, rotation, width, height } = elements[selectedElement];
      const newElement = {
        x: x + clientX - pointer.x,
        y: y + clientY - pointer.y,
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
      setPointer({ x: clientX, y: clientY })
    }
  }
  const handleMouseUp = (_event: MouseEvent) => {
    setIsDrawing(false);
    setIsDrag(false);
    handleToolClick(0);
  }


  const handleScroll = (e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey === true) {
      zoomCanvas(e.deltaY * -0.01);
      setZoomOffset({ x: e.clientX, y: e.clientY });
    } else {
      setPanOffset(prevState => {
        return { x: (prevState.x - e.deltaX * 0.2), y: (prevState.y - e.deltaY * 0.2) }
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
        <li><button className={"tool-icon selected"} onClick={() => handleToolClick(0)}><img src={arrowIcon} width={20} height={20} /></button></li>
        <li><button className={"tool-icon"} onClick={() => handleToolClick(1)}><img src={square} width={20} height={20} /></button></li>
        <li><button className={"tool-icon"} onClick={() => handleToolClick(2)}><img src={circle} width={20} height={20} /></button></li>
        <li><button className={"tool-icon"} onClick={() => handleToolClick(3)}><img src={line} width={20} height={20} /></button></li>
        <li><button className={"tool-icon"} onClick={() => handleToolClick(4)}><img src={eraser} width={20} height={20} /></button></li>
        <li><button className={"tool-icon"} onClick={() => setElements([])}><img src={deleteIcon} width={20} height={20} /></button></li>
      </ul>
      {/* <pre style={{ background: "white", position: "absolute", bottom: 0 }}> */}
      {/*   {JSON.stringify(params)} */}
      {/* </pre> */}
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
          <br />
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
      // onTouchStart={(e) => handleTouchStart(e)}
      // onTouchEnd={(e) => handleTouchUp(e)}
      // onTouchMove={(e) => handleTouchMove(e)}
      // onTouchCancel={(e) => handleTouchUp(e)}
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

      setVideoURL(videoURI);
    };

    const handleDataAvailable = (e: BlobEvent) => {
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
      mediaRecorder.start();
      setRecordCanvasState(prevState => !prevState);
    }
  }, [mediaRecorder, recordCanvasState]);
  const stopRecording = useCallback(() => {
    if (mediaRecorder) {
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
