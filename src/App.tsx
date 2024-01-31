import { useState, MouseEvent, TouchEvent, useEffect } from "react";
import { RoughGenerator } from "roughjs/bin/generator";
import rough from "roughjs";
import { Drawable } from "roughjs/bin/core";
import circle from "./assets/ellipse-outline.svg";
import square from "./assets/square-outline.svg";
import line from "./assets/line.svg";
import eraser from "./assets/eraser.svg";
import deleteIcon from "./assets/delete.svg";
import arrowIcon from "./assets/arrow.svg";

const generator: RoughGenerator = rough.generator();

interface CanvasElementsProps {
  x: number,
  y: number,
  type: string,
  width: number,
  height: number,
  strokeWidth: number,
  stroke: string,
  fill: boolean,
  rotation: number,
  updatedAt: number,
};
interface CanvasElement extends CanvasElementsProps {
  roughElement: Drawable
}

function DrawingBoard() {
  const toolList = ["selection", "rectangle", "circle", "line", "eraser"];

  const [isDrag, setIsDrag] = useState(false);
  const [isResizeDrag, setIsResizeDrag] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [tool, setTool] = useState<number>(1);
  const [strokeProps, setStrokeProps] = useState({ strokeWidth: 3, stroke: "#000000" });

  //
  //Creating ghost canvas for selection and resizing the canvas objects
  //

  var ghostCanvas: HTMLCanvasElement,
    gctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D;

  const drawCanvas = () => {
    canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (canvas) {
      ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      ctx.lineCap = "round";
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const rc = rough.canvas(canvas);
      elements.forEach(({ roughElement }) => {
        rc.draw(roughElement);
        console.log({ roughElement })
      });
    }
  }

  useEffect(() => {
    const objects = localStorage.getItem("drawingApp");
    if (objects)
      setElements(JSON.parse(objects));
  }, [])

  useEffect(() => {
    drawCanvas();
    console.log(JSON.stringify({ tool, isDrag, isResizeDrag, isDrawing }));
    localStorage.setItem("drawingApp", JSON.stringify(elements));
  }, [elements])


  /**
    @params  
    x: number,
    y: number,
    type: String,
    width: number,
    height: number,
    strokeWidth: number,
    stroke: String,
    fill: Boolean,
    rotation: number,
    updatedAt: Date,
  */
  const generateElement = (props: CanvasElementsProps): CanvasElement => {

    const { x, y, type, width, height, strokeWidth, stroke, fill, rotation, updatedAt } = props;
    var roughElement = generator.rectangle(x, y, width, height);
    switch (type) {
      case "rectangle":
        roughElement = generator.rectangle(x, y, width, height, { strokeWidth, stroke });
        break;
      case "line":
        roughElement = generator.line(x, y, width + x, height + y, { strokeWidth, stroke });
        break;
      case "circle":
        roughElement = generator.ellipse(x + width / 2, y + height / 2, width, height, { strokeWidth, stroke });
        break;
      default:
        break;
    }
    return { x, y, type, width, height, strokeWidth, stroke, fill, rotation, updatedAt, roughElement };
  }
  const handleMouseDown = (event: MouseEvent) => {
    if (tool == 0) {
      setIsDrag(true);
    } else {
      setIsDrawing(true);
      const { clientX, clientY } = event;
      const element = generateElement({
        x: clientX,
        y: clientY,
        type: toolList[tool],
        width: 0,
        height: 0,
        strokeWidth: strokeProps.strokeWidth,
        stroke: strokeProps.stroke,
        fill: false,
        rotation: 0,
        updatedAt: Date.now()
      });
      setElements(prevElements => [...prevElements, element])
    }
  }
  const handleMouseMove = (event: MouseEvent) => {
    const { clientX, clientY } = event;
    if (isDrawing) {
      const index = elements.length - 1;
      const { x, y } = elements[index];
      const newElement = generateElement({
        x,
        y,
        type: toolList[tool],
        width: clientX - x,
        height: clientY - y,
        strokeWidth: strokeProps.strokeWidth,
        stroke: strokeProps.stroke,
        fill: false,
        rotation: 0,
        updatedAt: Date.now()
      })

      const elementsClone = [...elements];
      elementsClone[index] = newElement;
      setElements(elementsClone);
    } else if (isDrag) {
      const index = elements.length - 1;
      const { type, stroke, strokeWidth, fill, rotation, width, height } = elements[index];
      const newElement = generateElement({
        x: clientX,
        y: clientY,
        type,
        width,
        height,
        strokeWidth,
        stroke,
        fill,
        rotation,
        updatedAt: Date.now()
      })
      const elementsClone = [...elements];
      elementsClone[index] = newElement;
      setElements(elementsClone);
    }
  }
  const handleMouseUp = (event: MouseEvent) => {
    setIsDrawing(false);
    setIsDrag(false);
  }


  const handleTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const { clientX, clientY } = e.touches[0];
    const element = generateElement({
      x: clientX,
      y: clientY,
      type: toolList[tool],
      width: 0,
      height: 0,
      strokeWidth: strokeProps.strokeWidth,
      stroke: strokeProps.stroke,
      fill: false,
      rotation: 0,
      updatedAt: Date.now()
    });
    setElements(prevElements => [...prevElements, element])
    console.log(e)
  }
  const handleTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const index = elements.length - 1;
    const { x, y } = elements[index];
    const { clientX, clientY } = e.touches[0];
    const newElement = generateElement({
      x,
      y,
      type: toolList[tool],
      width: clientX - x,
      height: clientY - y,
      strokeWidth: strokeProps.strokeWidth,
      stroke: strokeProps.stroke,
      fill: false,
      rotation: 0,
      updatedAt: Date.now()
    })

    const elementsClone = [...elements];
    elementsClone[index] = newElement;
    setElements(elementsClone);
  }

  const handleTouchUp = (e: TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
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
            value={strokeProps.stroke}

            onChange={(e) => setStrokeProps((prevProps) => {
              return {
                ...prevProps,
                stroke: e.target.value
              }
            })}
          /><label>Stroke color</label>
          <br />
          <input
            min={1}
            max={3}
            type="number"
            value={strokeProps.strokeWidth}
            onChange={(e) => {
              setStrokeProps((prevProps) => {
                return {
                  ...prevProps,
                  strokeWidth: parseInt(e.target.value)
                }
              })
            }
            } /><label>Stroke width</label>
        </li>
      </ul>
      <canvas
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
export default DrawingBoard;
