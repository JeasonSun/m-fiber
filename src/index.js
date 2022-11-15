import React from "./react";
import ReactDOM from "./react-dom";

const style = {
  border: "5px solid red",
  padding: "10px",
  margin: "10px",
};

// const element = (
//   <div style={style}>
//     A1
//     <div style={style}>
//       B1
//       <div style={style}>C1</div>
//       <div style={style}>C2</div>
//     </div>
//     <div style={style}>
//       B2
//       <div style={style}>D1</div>
//     </div>
//   </div>
// );
// console.log(element)

// const element = React.createElement(
//   "div",
//   { style, key: "A1" },
//   "A1",
//   React.createElement(
//     "div",
//     { style, key: "B1" },
//     "B1",
//     React.createElement("div", { style, key: "C1" }, "C1"),
//     React.createElement("div", { style, key: "C2" }, "C2")
//   ),
//   React.createElement(
//     "div",
//     { style, key: "B2" },
//     "B2",
//     React.createElement("div", { style, key: "D1" }, "D1")
//   )
// );
// console.log("element", element);

// ReactDOM.render(element, document.getElementById("root"));

// const element2 = React.createElement(
//   "div",
//   { style, key: "A1" },
//   "A1",
//   React.createElement(
//     "div",
//     { style, key: "B1" },
//     "B1",
//     React.createElement("div", { style, key: "C1" }, "C1"),
//     React.createElement("div", { style, key: "C2" }, "C2")
//   ),
//   React.createElement(
//     "div",
//     { style, key: "B2" },
//     "B2",
//     React.createElement("div", { style, key: "D1" }, "D1")
//   ),
//   React.createElement("div", { style, key: "B3" }, "B3")
// );

// const btn2 = document.getElementById("btn2");
// const btn3 = document.getElementById("btn3");

// btn2.addEventListener("click", () => {
//   ReactDOM.render(element2, document.getElementById("root"));
// });

// const element3 = React.createElement(
//   "div",
//   { style, key: "A1" },
//   "A1",
//   React.createElement(
//     "div",
//     { style, key: "B1" },
//     "B1",
//     React.createElement("div", { style, key: "C1" }, "C1"),
//     React.createElement("div", { style, key: "C2" }, "C2")
//   ),
//   React.createElement(
//     "div",
//     { style, key: "B2" },
//     "B2",
//     React.createElement("div", { style, key: "D1" }, "D1")
//   )
// );

// btn3.addEventListener("click", () => {
//   ReactDOM.render(element3, document.getElementById("root"));
// });

class Counter extends React.Component{
  constructor(props){
    super();
    this.state = {
      number: 1
    }
  }

  onBtnClick = ()=>{
    this.setState({
      number: this.state.number +1
    })
  }

  render(){
    return React.createElement(
      'div', 
      {number: this.state.number}, 
      React.createElement('span',{}, this.state.number),
      React.createElement('button', {onClick: this.onBtnClick }, 'ADD BUTTON')
    )
  }
}

ReactDOM.render(<Counter />, document.getElementById("root"));
