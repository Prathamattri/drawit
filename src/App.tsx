import React, { useState, MouseEvent, useRef, useEffect, useCallback, RefObject } from "react";
import { arrowIcon, square, circle, line, pencil, deleteIcon, eraser } from "./assets";
import { IdGenerator } from "./utils/idgen";

interface CanvasElementsProps {
  id: number,
  x: number,
  y: number,
  type: string,
  width: number,
  height: number,
  strokeWidth: number,
  stroke: string,
  fillColor: string,
  rotation: number,
  points?: Array<Array<number>>
  markDeleted: boolean,
  updatedAt: number,
};

export const DrawingBoardActions = {
  DRAW_SHAPE: "draw",
  RESIZE_SHAPE: "resize",
  DRAG_SHAPE: "drag",
  ROTATE_SHAPE: "rotate"
} as const

function DrawingBoard() {
  const [canvasVersionValue, setCanvasVersionValue] = useState(1);
  const toolList = ["selection", "rectangle", "circle", "line", "draw", "eraser"];

  //Using useRef hook ( and not useState ) for the purpose of sending the updated Index value to document 
  //eventlistener's callback
  const selectedElementIndexRef = useRef(-1)

  const [isDrag, setIsDrag] = useState(false);
  const [isIdle, _setIsIdle] = useState(true);
  // const [isResizeDrag, setIsResizeDrag] = useState(false);

  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [pointerPosDelta, setPointerPosDelta] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 })
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<CanvasElementsProps[]>(JSON.parse(localStorage.getItem("drawingApp") || "[]"));
  const [tool, setTool] = useState(0);
  const [toolProps, setToolProps] = useState({ strokeWidth: 4, stroke: "#000000", fillColor: "#00000000" });
  const [recordCanvasState, setRecordCanvasState] = useState(false);

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

  //
  //Canvas Drawing function
  //
  function drawCanvas() {
    if (canvas.current) {
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
        drawShapeOnCanvas(ctx, element);
      });
      ctx.restore();
      renderBoundaryOverSelected(selectedElementIndexRef.current, ctx);
    }
  }



  function drawShapeOnCanvas(ctx: CanvasRenderingContext2D, props: CanvasElementsProps) {
    let { x, y, type, width, height, strokeWidth, fillColor, stroke } = props;

    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.min(Math.max(strokeWidth * zoom, 1), 5);
    ctx.lineCap = "round";
    if (fillColor)
      ctx.fillStyle = fillColor;

    if (type != "draw" && type != "line") {
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
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    } else if (type === "circle") {
      const radX = width / 2;
      const radY = height / 2;

      const centerX = x + radX;
      const centerY = y + radY;

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radX, radY, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fill();
    } else if (type === "line") {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(width + x, height + y);
      ctx.stroke();
    } else if (type === "draw") {
      let points = props.points;
      if (!points) return;
      ctx.beginPath();
      ctx.moveTo(x, y);

      let previousPoint = [x, y];
      points.forEach(point => {
        ctx.lineTo(previousPoint[0] + point[0], previousPoint[1] + point[1])
        previousPoint = [previousPoint[0] + point[0], previousPoint[1] + point[1]];
      })
      ctx.stroke();
    }

  }

  //
  //Effect management
  //

  useEffect(() => {
    canvas.current?.addEventListener("wheel", (e) => handleScroll(e), { passive: false })
    canvas.current?.addEventListener("resize", () => setCanvasVersionValue(prevVal => prevVal + 1));
    document.addEventListener("keydown", handleKeyPress);
    return () => {
      canvas.current?.removeEventListener("wheel", handleScroll);
      canvas.current?.removeEventListener("resize", () => { });
      document.removeEventListener("keydown", () => { });
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("drawingApp", JSON.stringify(elements));
    drawCanvas();
    drawMousePointer(ctx, pointer.x, pointer.y);
  }, [canvasVersionValue, elements, zoom, panOffset])


  //
  //Utilities
  //

  const drawMousePointer = (ctx: CanvasRenderingContext2D, mouseX: number, mouseY: number) => {

    ctx.strokeStyle = "#000000";
    ctx.fillStyle = "#B13DFF";
    ctx.beginPath();
    ctx.moveTo(mouseX, mouseY);
    ctx.lineTo(mouseX + 30, mouseY + 20);
    ctx.lineTo(mouseX + 10, mouseY + 10);
    ctx.lineTo(mouseX, mouseY + 20);
    ctx.lineTo(mouseX, mouseY);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();

  }

  const handleChangeColor = (value: string | number, property: string) => {
    setToolProps((prevProps) => {
      return {
        ...prevProps,
        [property]: value
      }
    })
  }

  const deleteSelected = useCallback((currentSelected: number) => {
    setElements((prevElement) => {
      return prevElement.filter((_, index) => index !== currentSelected);
    })

  }, [selectedElementIndexRef.current]);

  function zoomCanvas(deltaY: number) {
    setZoom(prevState => Math.max(Math.min(prevState + deltaY, 5), 0.2));
  }

  function clearContext(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, canvas.current!.width, canvas.current!.height);
  }
  function getMouseCoordinates(event: MouseEvent) {
    const clientX = (event.clientX - panOffset.x * zoom + zoomOffset.x * (zoom - 1)) / zoom;
    const clientY = (event.clientY - panOffset.y * zoom + zoomOffset.y * (zoom - 1)) / zoom;

    return { clientX, clientY };
  };

  function renderBoundaryOverSelected(selectedElement: number, ctx: CanvasRenderingContext2D) {
    if (selectedElement == -1) return;

    debugger
    const boundary = {
      x: elements[selectedElement].x - 10,
      y: elements[selectedElement].y - 10,

      x2: elements[selectedElement].x + elements[selectedElement].width + 10,
      y2: elements[selectedElement].y + elements[selectedElement].height + 10,
    }
    ctx.save();

    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(boundary.x, boundary.y);
    ctx.lineTo(boundary.x2, boundary.y);
    ctx.lineTo(boundary.x2, boundary.y2);
    ctx.lineTo(boundary.x, boundary.y2);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
  //
  //Event handlers
  //

  function handleKeyPress(e: KeyboardEvent) {
    if (e.key === "Delete") {
      console.log(selectedElementIndexRef.current);
      deleteSelected(selectedElementIndexRef.current);
      selectedElementIndexRef.current = -1;
    } else {
      switch (e.key) {
        case 'v':
        case '1':
          handleToolClick(1);
          break;
        case 'r':
        case '2':
          handleToolClick(2);
          break;
        case 'c':
        case '3':
          handleToolClick(3);
          break;
        case 'l':
        case '4':
          handleToolClick(4);
          break;
        case 'p':
        case '5':
          handleToolClick(5);
          break;
        default:
          break;
      }
    }
  }

  function handleMouseDown(event: MouseEvent) {
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
        var imgData = gctx.getImageData(event.clientX, event.clientY, 6, 6);

        if (imgData.data[3] > 0) {
          setIsDrag(true);
          selectedElementIndexRef.current = i;
          setPointer({ x: clientX, y: clientY });
          clearContext(gctx);
          renderBoundaryOverSelected(selectedElementIndexRef.current, ctx);
          return;
        }
      }
      selectedElementIndexRef.current = -1;
      clearContext(gctx);
    } else {
      setIsDrawing(true);
      const newId = IdGenerator();
      const element: CanvasElementsProps = {
        id: newId,
        x: clientX,
        y: clientY,
        type: toolList[tool],
        width: 0,
        height: 0,
        strokeWidth: toolProps.strokeWidth,
        stroke: toolProps.stroke,
        points: toolList[tool] === "draw" ? [[0, 0]] : undefined,
        fillColor: toolProps.fillColor,
        markDeleted: false,
        rotation: 0,
        updatedAt: Date.now()
      };
      setElements(prevElements => [...prevElements, element])
    }
    drawMousePointer(ctx, clientX, clientY)
  }

  function handleMouseMove(event: MouseEvent) {
    const { clientX, clientY } = getMouseCoordinates(event);
    if (isDrawing) {

      const index = elements.length - 1;
      let { x, y, id, points } = elements[index];
      let height = clientY - y;
      let width = clientX - x;

      if (points != undefined) {

        let deltaX
        let deltaY
        if (points.length == 1) {
          deltaX = x - clientX;
          deltaY = y - clientY;
        } else {
          deltaX = clientX - pointer.x;
          deltaY = clientY - pointer.y;
        }
        if (pointerPosDelta.x - deltaX !== 0 || pointerPosDelta.y - deltaY !== 0) {
          points.push([deltaX, deltaY])
          height = Math.max(height, elements[index].height);
          width = Math.max(width, elements[index].width);
          setPointerPosDelta({ x: deltaX, y: deltaY })
        }
      }

      if (event.shiftKey) {
        if (width > height) height = width;
        else width = height;
      }
      const newElement: CanvasElementsProps = {
        id,
        x,
        y,
        type: toolList[tool],
        width,
        height,
        strokeWidth: toolProps.strokeWidth,
        stroke: toolProps.stroke,
        points,
        fillColor: toolProps.fillColor,
        markDeleted: false,
        rotation: 0,
        updatedAt: Date.now()
      };

      const elementsClone = [...elements];
      elementsClone[index] = newElement;
      setElements(elementsClone);
      setPointer({ x: clientX, y: clientY })

    } else if (isDrag) {

      const { id, x, y, type, stroke, strokeWidth, fillColor, points, rotation, width, height } = elements[selectedElementIndexRef.current];
      const newElement = {
        id,
        x: x + clientX - pointer.x,
        y: y + clientY - pointer.y,
        type,
        width,
        height,
        points,
        strokeWidth,
        stroke,
        fillColor,
        markDeleted: false,
        rotation,
        updatedAt: Date.now()
      }
      const elementsClone = [...elements];
      elementsClone[selectedElementIndexRef.current] = newElement;
      setElements(elementsClone);

      // renderBoundaryOverSelected(selectedElementIndexRef.current, ctx);
      setPointer({ x: clientX, y: clientY })
    } if (isIdle) {
      let imgData = ctx.getImageData(clientX, clientY, 6, 6);
      if (canvas.current) {

        if (imgData.data[3] > 0) {
          canvas.current.style.cursor = "move";
        } else {
          canvas.current.style.cursor = "pointer";
        }
      }
      drawCanvas();
    }
    drawMousePointer(ctx, clientX, clientY);
  }

  function handleMouseUp(_event: MouseEvent) {
    setIsDrawing(false);
    setIsDrag(false);
  }

  function handleScroll(e: WheelEvent) {
    e.preventDefault();
    if (e.ctrlKey === true) {
      zoomCanvas(e.deltaY * -0.001);
      setZoomOffset({ x: e.clientX, y: e.clientY });
    } else if (e.shiftKey === true) {
      setPanOffset(prevState => {
        return { x: (prevState.x - e.deltaY * 0.2) / zoom, y: (prevState.y) / zoom }
      })
    } else {
      setPanOffset(prevState => {
        return { x: (prevState.x - e.deltaX * 0.2) / zoom, y: (prevState.y - e.deltaY * 0.2) / zoom }
      });
    }
  }

  function handleToolClick(toolNum: number) {
    setTool(toolNum - 1);
    var tools = document.querySelectorAll(".tool-icon");
    tools.forEach(tool => tool.classList.remove("selected"));
    tools[toolNum - 1].classList.add("selected");
  }


  return (
    <>
      <div className="tools">
        <ul>
          <li>
            <button className={"tool-icon selected"} onClick={() => handleToolClick(1)}>
              <img src={arrowIcon} />
              <div className="tool-num">1</div>
            </button>
          </li>
          <li>
            <button className={"tool-icon"} onClick={() => handleToolClick(2)}>
              <img src={square} />
              <div className="tool-num">2</div>
            </button>
          </li>
          <li>
            <button className={"tool-icon"} onClick={() => handleToolClick(3)}>
              <img src={circle} />
              <div className="tool-num">3</div>
            </button>
          </li>
          <li>
            <button className={"tool-icon"} onClick={() => handleToolClick(4)}>
              <img src={line} />
              <div className="tool-num">4</div>
            </button>
          </li>
          <li>
            <button className={"tool-icon"} onClick={() => handleToolClick(5)}>
              <img src={pencil} />
              <div className="tool-num">5</div>
            </button>
          </li>
          <li>
            <button className={"tool-icon"} onClick={() => handleToolClick(6)}>
              <img src={eraser} />
              <div className="tool-num">6</div>
            </button>
          </li>
          <li>
            <button className={"tool-icon"} onClick={() => setElements([])}>
              <img src={deleteIcon} />
            </button>
          </li>
        </ul>
      </div>

      <PropertiesPanel handleIconPress={handleChangeColor} />
      <VideoRecordingComponent canvasRef={canvas} recordCanvasState={recordCanvasState} setRecordCanvasState={setRecordCanvasState} />
      <div
        className="zoom-tool"
        onClick={() => {
          setZoom(1)
          setZoomOffset({ x: 0, y: 0 })
        }}>
        {new Intl.NumberFormat("en-US", { style: "percent" }).format(zoom)}
      </div>
      <canvas
        ref={canvas}
        id="canvas"
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={(e) => handleMouseDown(e)}
        onMouseUp={(e) => handleMouseUp(e)}
        onMouseMove={(e) => handleMouseMove(e)}
        onKeyDown={(e: any) => handleKeyPress(e)}
      // onMouseOut={(e) => handleMouseUp(e)}
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

function VideoRecordingComponent({ canvasRef, recordCanvasState, setRecordCanvasState }: VideoComponentProps) {
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

function PropertiesPanel({ handleIconPress }: { handleIconPress: (value: string | number, property: string) => void }) {

  const [propertiesValue, setPropertiesValue] = useState({
    stroke: "none",
    strokeWidth: 4,
    fillColor: "#00000000"
  })
  const strokeColorOptions = ["#000000", "#e5383b", "#77bfa3", "#5a189a", "#9d4edd"]
  const fillColorOptions = ["none", "#e5383b", "#77bfa3", "#5a189a", "#9d4edd"]

  const strokeWidthOptions = [
    {
      title: "SM",
      strokeWidth: 2
    },
    {
      title: "MD",
      strokeWidth: 4
    },
    {
      title: "XL",
      strokeWidth: 7
    },
  ]

  return (
    <div className="properties-panel">
      <h1>Properties Panel</h1>
      <div style={{ display: "flex", flexDirection: "column", rowGap: "1rem", padding: "1.3rem", }}>
        <h2>Stroke Color</h2>
        <div style={{ display: 'grid', gridTemplateColumns: "repeat(auto-fill, minmax(2rem,1fr))", gap: "0.5rem", overflowY: "scroll", height: "6.5rem", padding: "0 1rem 0 0" }}>
          {
            strokeColorOptions.map((color, ind) => (
              <div
                key={ind}
                className="color-icon"
                style={{ "--icon-clr": color } as React.CSSProperties}
                onClick={() => {
                  handleIconPress(color, "stroke")
                  setPropertiesValue(prevVal => ({
                    ...prevVal,
                    stroke: color
                  }))
                }}
              >
              </div>
            ))
          }
        </div>
        <div>
          <input
            type="color"
            value={propertiesValue.stroke}
            onChange={(e) => {
              handleIconPress(e.target.value, "stroke")
              setPropertiesValue(prevVal => ({
                ...prevVal,
                stroke: e.target.value
              }))
            }}
          />
        </div>
        <div>
          <h2>Stroke Width</h2>
          <br />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.5rem" }}>
            {
              strokeWidthOptions.map((option, ind) => (
                <div
                  key={ind}
                  className="stroke-width-btn"
                  onClick={() => {
                    handleIconPress(option.strokeWidth, "strokeWidth")
                    setPropertiesValue(prevVal => ({
                      ...prevVal,
                      strokeWidth: option.strokeWidth
                    }))
                  }}
                  style={{ "--stroke-width": `${(ind + 1) * 2}px` } as React.CSSProperties}
                >
                  <span ></span>
                </div>
              ))
            }
          </div>
        </div>
        <div>
          <h2>Fill Color</h2>
          <br />
          <div style={{ display: 'grid', gridTemplateColumns: "repeat(auto-fill, minmax(2rem,1fr))", gap: "0.5rem", overflowY: "scroll", height: "6.5rem", padding: "0 1rem 0 0" }}>
            {
              fillColorOptions.map((color, ind) => (
                <div
                  key={ind}
                  className="color-icon"
                  style={{ "--icon-clr": color } as React.CSSProperties}
                  onClick={() => {
                    handleIconPress(color, "fillColor")
                    setPropertiesValue(prevVal => ({
                      ...prevVal,
                      fillColor: color
                    }))
                  }}
                >
                </div>
              ))
            }
          </div>
          <div>
            <input
              type="color"
              value={propertiesValue.fillColor}
              onChange={(e) => {
                handleIconPress(e.target.value, "fillColor")
                setPropertiesValue(prevVal => ({
                  ...prevVal,
                  fillColor: e.target.value
                }))
              }}
            />
          </div>
        </div>
      </div>
    </div>

  );
}

export default DrawingBoard;
