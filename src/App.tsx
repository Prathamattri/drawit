import { useState, MouseEvent, useEffect } from "react";
import { RoughGenerator } from "roughjs/bin/generator";
import rough from "roughjs";
import { Drawable } from "roughjs/bin/core";
const generator: RoughGenerator = rough.generator();

interface CanvasElementsProps {
  x: number,
  y: number,
  type: String,
  width: number,
  height: number,
  strokeWidth: number,
  strokeStyle: String,
  fill: Boolean,
  rotation: number,
  updatedAt: number,
};
interface CanvasElement extends CanvasElementsProps {
  roughElement: Drawable
}
function DrawingBoard() {

  const toolList = ["selection", "rectangle", "circle", "line", "eraser"];

  const [isDrawing, setIsDrawing] = useState(false);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [tool, setTool] = useState<number>(1);

  const drawCanvas = () => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const rc = rough.canvas(canvas);
      elements.forEach(({ roughElement }) => rc.draw(roughElement));
    }
  }

  useEffect(() => {
    drawCanvas();
  }, [elements])


  /**
   * @params   x: number,
    y: number,
    type: String,
    width: number,
    height: number,
    strokeWidth: number,
    strokeStyle: String,
    fill: Boolean,
    rotation: number,
    updatedAt: Date,
  */
  const generateElement = (props: CanvasElementsProps): CanvasElement => {

    const { x, y, type, width, height, strokeWidth, strokeStyle, fill, rotation, updatedAt } = props;
    var roughElement = generator.rectangle(x, y, width, height);
    switch (type) {
      //case "select":
      case "rectangle":
        roughElement = generator.rectangle(x, y, width, height);
        break;
      case "line":
        roughElement = generator.line(x, y, width + x, height + y);
        break;
      case "circle":
        roughElement = generator.ellipse(x, y, width, height);
        break;
      default:
        break;
    }
    return { x, y, type, width, height, strokeWidth, strokeStyle, fill, rotation, updatedAt, roughElement };
  }
  const handleMouseDown = (event: MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    setIsDrawing(true);
    const { clientX, clientY } = event;
    const element = generateElement({
      x: clientX,
      y: clientY,
      type: toolList[tool],
      width: 0,
      height: 0,
      strokeWidth: 1,
      strokeStyle: "black",
      fill: false,
      rotation: 0,
      updatedAt: Date.now()
    });
    setElements(prevElements => [...prevElements, element])
  }
  const handleMouseMove = (event: MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (!isDrawing) return;
    const index = elements.length - 1;
    const { x, y } = elements[index];
    const { clientX, clientY } = event;
    const newElement = generateElement({
      x,
      y,
      type: toolList[tool],
      width: clientX - x,
      height: clientY - y,
      strokeWidth: 1,
      strokeStyle: "black",
      fill: false,
      rotation: 0,
      updatedAt: Date.now()
    })

    const elementsClone = [...elements];
    elementsClone[index] = newElement;
    setElements(elementsClone);
  }
  const handleMouseUp = (event: MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    setIsDrawing(false);
  }


  const handleTouchStart = (e: TouchEvent) => {
    setIsDrawing(true);
    const { clientX, clientY } = e.touches[0];
    const element = generateElement({
      x: clientX,
      y: clientY,
      type: toolList[tool],
      width: 0,
      height: 0,
      strokeWidth: 1,
      strokeStyle: "black",
      fill: false,
      rotation: 0,
      updatedAt: Date.now()
    });
    setElements(prevElements => [...prevElements, element])
    console.log(e)
  }
  const handleTouchMove = (e: TouchEvent) => {
    //    e.preventDefault();
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
      strokeWidth: 1,
      strokeStyle: "black",
      fill: false,
      rotation: 0,
      updatedAt: Date.now()
    })

    const elementsClone = [...elements];
    elementsClone[index] = newElement;
    setElements(elementsClone);
  }

  const handleTouchUp = (e: TouchEvent) => {
    setIsDrawing(false);
  }
  drawCanvas();
  return (
    <>
      <ul style={{ margin: "10px", position: "absolute", display: "flex", listStyle: "none", gap: "5px" }}>
        <li><button onClick={() => setTool(0)}>Selection</button></li>
        <li><button onClick={() => setTool(1)}>Rectangle</button></li>
        <li><button onClick={() => setTool(2)}>Ellipse</button></li>
        <li><button onClick={() => setTool(3)}>Line</button></li>
        <li><button onClick={() => setTool(4)}>Eraser</button></li>
      </ul>
      <canvas
        style={{ backgroundColor: "#dedede" }}
        id="canvas"
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={(e) => handleMouseDown(e)}
        onMouseUp={(e) => handleMouseUp(e)}
        onMouseMove={(e) => handleMouseMove(e)}
        onTouchStart={(e) => handleTouchStart(e)}
        onTouchEnd={(e) => handleTouchUp(e)}
        onTouchMove={(e) => handleTouchMove(e)}
      >
        Drawing Canvas
      </canvas>
    </>);
}
export default DrawingBoard
