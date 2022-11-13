import {
  TAG_ROOT,
  TAG_TEXT,
  TAG_HOST,
  ELEMENT_TEXT,
  PLACEMENT,
  DELETION,
  UPDATE,
} from "./constants";
import { setProps } from "./utils";

let nextUnitOfWork = null;
let workInProgress = null;
let currentRoot = null;
let deletions = [];

export function scheduleRoot(rootFiber) {
  if (currentRoot && currentRoot.alternate) {
    workInProgress = currentRoot.alternate;
    workInProgress.alternate = currentRoot;
    if (rootFiber) workInProgress.props = rootFiber.props;
  }else if (currentRoot) {
    rootFiber.alternate = currentRoot;
    workInProgress = rootFiber;
  } else {
    workInProgress = rootFiber;
  }
  workInProgress.firstEffect =
    workInProgress.lastEffect =
    workInProgress.nextEffect =
      null;
  nextUnitOfWork = workInProgress;
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
    default:
      console.log("[beginWork]", "暂时无法处理此类型Fiber", currentFiber.tag);
      break;
  }
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
  while (childIndex < newChildren.length || oldFiber) {
    const newChild = newChildren[childIndex];
    let tag;
    if (newChild && newChild.type === ELEMENT_TEXT) {
      tag = TAG_TEXT; // 文本类fiber
    } else if (newChild && typeof newChild.type === "string") {
      tag = TAG_HOST; // 原生dom类Fiber
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
  let returnDOM = returnFiber.stateNode;
  if (currentFiber.effectTag === PLACEMENT) {
    returnDOM.appendChild(currentFiber.stateNode);
  } else if (currentFiber.effectTag === DELETION) {
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
