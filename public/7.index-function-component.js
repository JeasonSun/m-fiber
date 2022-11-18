import React from "./react";
import ReactDOM from "./react-dom";


const ADD = "ADD";
function reducer(state, action) {
  switch (action.type) {
    case ADD:
      return { count: state.count + 1 };
    default:
      return state;
  }
}

function FunctionCounter(props) {
  const [counterState, dispatch] = React.useReducer(reducer, { count: 0 });
  const [numberState, setNumber] = React.useState({ number: 0 });
  return React.createElement(
    "div",
    {},
    React.createElement(
      "div",
      {},
      React.createElement("span", {}, counterState.count),
      React.createElement(
        "button",
        {
          onClick: () => {
            dispatch({ type: ADD });
          },
        },
        "加1"
      )
    ),
    React.createElement(
      "div",
      {},
      React.createElement("span", {}, numberState.number),
      React.createElement(
        "button",
        {
          onClick: () => {
            setNumber({ number: numberState.number + 2 });
          },
        },
        "加2"
      )
    )
  );
}

ReactDOM.render(<FunctionCounter />, document.getElementById("root"));
