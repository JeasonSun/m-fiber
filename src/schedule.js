import {
  TAG_ROOT,
  TAG_TEXT,
  TAG_HOST,
  TAG_CLASS_COMPONENT,
  TAG_FUNCTION_COMPONENT,
  ELEMENT_TEXT,
  PLACEMENT,
  DELETION,
  UPDATE,
} from "./constants";
import { UpdateQueue, Update } from "./updateQueue";
import { setProps } from "./utils";

let nextUnitOfWork = null;
let workInProgress = null;
let currentRoot = null;
let deletions = [];
let workInProgressFiber = null;
let hookIndex = 0;

export function scheduleRoot(rootFiber) {
  if (currentRoot && currentRoot.alternate) {
    workInProgress = currentRoot.alternate;
    workInProgress.alternate = currentRoot;
    if (rootFiber) workInProgress.props = rootFiber.props;
  } else if (currentRoot) {
    if (rootFiber) {
      rootFiber.alternate = currentRoot;
      workInProgress = rootFiber;
    } else {
      workInProgress = {
        ...currentRoot,
        alternate: currentRoot,
      };
    }
  } else {
    workInProgress = rootFiber;
  }
  workInProgress.firstEffect =
    workInProgress.lastEffect =
    workInProgress.nextEffect =
      null;
  nextUnitOfWork = workInProgress;
  console.log("重新开始渲染");
}

// 遍历fiber树，分割最小任务
function performUnitOfWork(currentFiber) {
  beginWork(currentFiber); // 对当前fiber进行处理，这里面会构建fiber树。
  if (currentFiber.child) {
    return currentFiber.child;
  }

  while (currentFiber) {
    // 由于currentFiber没有child了，可以直接完成
    completeUnitOfWork(currentFiber);
    if (currentFiber.sibling) {
      return currentFiber.sibling;
    }
    currentFiber = currentFiber.return;
  }
}

function beginWork(currentFiber) {
  console.log("[beginWork]", currentFiber);
  switch (currentFiber.tag) {
    case TAG_ROOT:
      updateHostRoot(currentFiber);
      break;
    case TAG_HOST:
      updateHost(currentFiber);
      break;
    case TAG_TEXT:
      updateText(currentFiber);
      break;
    case TAG_CLASS_COMPONENT:
      updateClassComponent(currentFiber);
      break;
    case TAG_FUNCTION_COMPONENT:
      updateFunctionComponent(currentFiber);
      break;
    default:
      console.log("[beginWork]", "暂时无法处理此类型Fiber", currentFiber.tag);
      break;
  }
}

function updateClassComponent(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = new currentFiber.type(currentFiber.props);
    currentFiber.stateNode.internalFiber = currentFiber;
    currentFiber.updateQueue = new UpdateQueue();
  }
  currentFiber.stateNode.state = currentFiber.updateQueue.forceUpdate(
    currentFiber.stateNode.state
  );

  let newElement = currentFiber.stateNode.render();

  let newChildren = [newElement];
  reconcileChildren(currentFiber, newChildren);
}

function updateFunctionComponent(currentFiber) {
  workInProgressFiber = currentFiber;
  hookIndex = 0;
  workInProgressFiber.hooks = [];

  const newElement = currentFiber.type(currentFiber.props);
  const newChildren = [newElement];
  reconcileChildren(currentFiber, newChildren);
}

// rootFiber转换为真实DOM
function updateHostRoot(currentFiber) {
  // 1. 构建真实DOM， 因为是rootFiber，stateNode已经存在了container真实DOM
  // 2. 协调children
  const newChildren = currentFiber.props.children;
  reconcileChildren(currentFiber, newChildren);
}

function updateHost(currentFiber) {
  // 1.构建真实DOM
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }

  const newChildren = currentFiber.props.children;
  reconcileChildren(currentFiber, newChildren);
}

function updateText(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
}

function createDOM(currentFiber) {
  if (currentFiber.tag === TAG_HOST) {
    const stateNode = document.createElement(currentFiber.type);
    updateDOM(stateNode, {}, currentFiber.props);
    return stateNode;
  } else if (currentFiber.tag === TAG_TEXT) {
    return document.createTextNode(currentFiber.props.text);
  }
}

function updateDOM(element, oldProps, newProps) {
  setProps(element, oldProps, newProps);
}

function reconcileChildren(currentFiber, newChildren) {
  let childIndex = 0;
  let prevSibling;
  let oldFiber = currentFiber.alternate && currentFiber.alternate.child;
  if (oldFiber) {
    oldFiber.firstEffect = oldFiber.lastEffect = oldFiber.nextEffect = null;
  }
  while (childIndex < newChildren.length || oldFiber) {
    const newChild = newChildren[childIndex];
    let tag;
    if (newChild && newChild.type === ELEMENT_TEXT) {
      tag = TAG_TEXT; // 文本类fiber
    } else if (newChild && typeof newChild.type === "string") {
      tag = TAG_HOST; // 原生dom类Fiber
    } else if (
      newChild &&
      typeof newChild.type === "function" &&
      newChild.type.prototype.isComponent
    ) {
      // 类组件
      tag = TAG_CLASS_COMPONENT;
    } else if (newChild && typeof newChild.type === "function") {
      // 函数组件
      tag = TAG_FUNCTION_COMPONENT;
    } else {
      console.log("其他类型的Vdom", newChild);
    }
    const isSameType = oldFiber && newChild && oldFiber.type === newChild.type;
    let newFiber;
    if (isSameType) {
      // 如果是相同类型，更新
      if (oldFiber.alternate) {
        newFiber = oldFiber.alternate;
        newFiber.props = newChild.props;
        newFiber.effectTag = UPDATE;
        newFiber.nextEffect = null;
        newFiber.alternate = oldFiber;
        newFiber.updateQueue = oldFiber.updateQueue || new UpdateQueue();
      } else {
        newFiber = {
          tag: oldFiber.tag,
          type: oldFiber.type,
          props: newChild.props,
          stateNode: oldFiber.stateNode,
          return: currentFiber,
          effectTag: UPDATE,
          nextEffect: null,
          alternate: oldFiber,
          updateQueue: oldFiber.updateQueue || new UpdateQueue(),
        };
      }
    } else {
      // 创建新的fiber，删除老的fiber
      if (newChild) {
        newFiber = {
          tag,
          type: newChild.type,
          props: newChild.props,
          stateNode: null,
          return: currentFiber,
          effectTag: PLACEMENT,
          nextEffect: null,
          updateQueue: new UpdateQueue(),
        };
      }

      if (oldFiber) {
        oldFiber.effectTag = DELETION;
        deletions.push(oldFiber);
      }
    }

    if (childIndex === 0) {
      currentFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    childIndex++;
  }

  console.log("reconcileChildren");
}

/**
 * 完成当前fiber的遍历，收集Effect
 * 每个fiber都有firstEffect/lastEffect
 */
function completeUnitOfWork(currentFiber) {
  console.log("[completeUnitOfWork]", currentFiber);
  const returnFiber = currentFiber.return;
  if (!returnFiber) {
    return;
  }
  if (!returnFiber.firstEffect) {
    returnFiber.firstEffect = currentFiber.firstEffect;
  }
  // 先让returnFiber 连接上自己的effectList
  if (currentFiber.lastEffect) {
    if (returnFiber.lastEffect) {
      returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
    }
    returnFiber.lastEffect = currentFiber.lastEffect;
  }

  // 如果自己有effect，在父亲的effectList上加入自己
  if (currentFiber.effectTag) {
    if (returnFiber.lastEffect) {
      returnFiber.lastEffect.nextEffect = currentFiber;
    } else {
      returnFiber.firstEffect = currentFiber;
    }
    returnFiber.lastEffect = currentFiber;
  }
}

/**
 * commit阶段
 * 从rootFiber的EffectList开始提交
 */
function commitRoot() {
  console.log("commit阶段开始");
  console.log(workInProgress);
  deletions.forEach(commitWork);
  let currentFiber = workInProgress.firstEffect;
  while (currentFiber) {
    commitWork(currentFiber);
    currentFiber = currentFiber.nextEffect;
  }
  currentRoot = workInProgress;
  workInProgress = null;
  deletions.length = 0;
}

function commitWork(currentFiber) {
  if (!currentFiber) {
    return;
  }
  let returnFiber = currentFiber.return;
  while (
    returnFiber.tag !== TAG_HOST &&
    returnFiber.tag !== TAG_ROOT &&
    returnFiber.tag !== TAG_TEXT
  ) {
    returnFiber = returnFiber.return;
  }
  let returnDOM = returnFiber.stateNode;
  if (currentFiber.effectTag === PLACEMENT) {
    // currentFiber.stateNode有可能是类组件的实例
    let nextFiber = currentFiber;
    while (
      nextFiber &&
      nextFiber.tag !== TAG_HOST &&
      nextFiber.tag !== TAG_TEXT
    ) {
      nextFiber = nextFiber.child;
    }
    returnDOM.appendChild(nextFiber.stateNode);
  } else if (currentFiber.effectTag === DELETION) {
    commitDeletion(currentFiber, returnDOM);
    returnDOM.removeChild(currentFiber.stateNode);
  } else if (currentFiber.effectTag === UPDATE) {
    if (currentFiber.type === ELEMENT_TEXT) {
      if (currentFiber.alternate.props.text !== currentFiber.props.text) {
        currentFiber.stateNode.textContent = currentFiber.props.text;
      }
    } else {
      updateDOM(
        currentFiber.stateNode,
        currentFiber.alternate.props,
        currentFiber.props
      );
    }
  }
  currentFiber.effectTag = null;
}

function commitDeletion(currentFiber, returnDOM) {
  if (currentFiber.tag === TAG_HOST || currentFiber.tag === TAG_TEXT) {
    returnDOM.removeChild(currentFiber.stateNode);
  } else {
    commitDeletion(currentFiber.child, returnDOM);
  }
}

/****
 * 工作循环，注册IdleCallback
 */
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() > 1;
  }

  if (!nextUnitOfWork && workInProgress) {
    console.log("render阶段结束");
    commitRoot();
  }

  // 每次循环后再次注册idleCallback
  requestIdleCallback(workLoop, { timeout: 500 });
}

requestIdleCallback(workLoop, { timeout: 500 });

/************* hooks *******************/

export function useReducer(reducer, initialState) {
  let newHook =
    workInProgressFiber.alternate &&
    workInProgressFiber.alternate.hooks &&
    workInProgressFiber.alternate.hooks[hookIndex];
  if (newHook) {
    // 更新阶段
    newHook.state = newHook.updateQueue.forceUpdate(newHook.state);
  } else {
    // 初始化阶段
    newHook = {
      state: initialState,
      updateQueue: new UpdateQueue(),
    };
  }

  const dispatch = (action) => {
    let payload = reducer ? reducer(newHook.state, action) : action;
    newHook.updateQueue.enqueueUpdate(new Update(payload));
    scheduleRoot();
  };

  workInProgressFiber.hooks[hookIndex] = newHook;
  hookIndex++;
  return [newHook.state, dispatch];
}

export function useState(initialState) {
  return useReducer(null, initialState);
}
