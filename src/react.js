import { ELEMENT_TEXT } from "./constants";
import { Update } from "./updateQueue";
import { scheduleRoot, useReducer, useState } from "./schedule";

function createElement(type, config, ...children) {
  delete config._self;
  delete config._source;
  return {
    type,
    props: {
      ...config,
      children: children.map((child) =>
        typeof child === "object"
          ? child
          : {
              type: ELEMENT_TEXT,
              props: {
                text: child,
                children: [],
              },
            }
      ),
    },
  };
}

class Component {
  constructor(props) {
    this.props = props;
  }
  setState(payload) {
    let update = new Update(payload);
    this.internalFiber.updateQueue.enqueueUpdate(update);
    scheduleRoot();
  }
}

Component.prototype.isComponent = {};

const React = {
  createElement,
  Component,
  useReducer,
  useState,
};

export default React;
