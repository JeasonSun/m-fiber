## 前置知识点

### requestAnimationFrame (RAF)

### requestIdleCallback

### 单链表 （updateQueue）

## 初次渲染

### 1. 注册 requestIdleCallback，在每一帧的空闲时间运行 workLoop

```javascript
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
```

## 2. 从 workLoop 中可以看出，只要 nextUnitOfWork 有值，并且有空闲时间，就会执行 performUnitOfWork。

- performUnitOfWork 就是分割最小的工作单元，不断获取最新的 nextUnitOfWork

```javascript
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
```

### 3. 初次渲染，会构建一个 rootFiber，并且将 nextUnitOfWork 赋值为 rootFiber，那么怎么工作循环就开始了。

```javascript
function render(element, container) {
  const rootFiber = {
    tag: TAG_ROOT,
    stateNode: container,
    props: {
      children: [element],
    },
  };
  scheduleRoot(rootFiber);
}

function scheduleRoot(rootFiber) {
  workInProgress = rootFiber;
  nextUnitOfWork = rootFiber;
}
```

### 4. 在 performUnitOfWork 中，每个执行的工作任务需要记录 currentFiber 的开始和结束。

```javascript
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
```

### 5. 不同 tag 的 Fiber 使用不同的 update 方案，主要逻辑就是创建真实 DOM，以及 reconcileChildren，生成对应的子 fiber，以便工作循环中得到 nextUnitOfWork。以 updateHost 为例：

```javascript
function updateHost(currentFiber) {
  // 1.构建真实DOM
  currentFiber.stateNode = createDOM(currentFiber);
  const newChildren = currentFiber.props.children;
  reconcileChildren(currentFiber, newChildren);
}
function createDOM(currentFiber) {
  if (currentFiber.tag === TAG_HOST) {
    const stateNode = document.createElement(currentFiber.type);
    updateDOM({}, currentFiber.props, stateNode);
    return stateNode;
  } else if (currentFiber.tag === TAG_TEXT) {
    return document.createTextNode(currentFiber.props.text);
  }
}
function reconcileChildren(currentFiber, newChildren) {
  let childIndex = 0;
  let prevSibling;
  while (childIndex < newChildren.length) {
    const newChild = newChildren[childIndex];
    let tag;
    if (newChild && newChild.type === ELEMENT_TEXT) {
      tag = TAG_TEXT; // 文本类fiber
    } else if (newChild && typeof newChild.type === "string") {
      tag = TAG_HOST; // 原生dom类Fiber
    }
    const newFiber = {
      tag,
      type: newChild.type,
      props: newChild.props,
      stateNode: null,
      return: currentFiber,
      effectTag: PLACEMENT,
      nextEffect: null,
    };
    if (childIndex === 0) {
      currentFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    childIndex++;
  }

  console.log("reconcileChildren");
}
```

### 6. completeUnitOfWork 的工作任务主要是收集 Effect，构建 EffectList。

- 将自己的 EffectList 合并到父级的 EffectList 后面。
- 将自己的 Effect 合并到父级的 EffectList 最后。

```javascript
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
```

### 7. commit：commit 阶段，根据 EffectList，循环 Effect，完成插入/更新操作。

```javascript
function commitRoot() {
  console.log("commit阶段开始");
  console.log(workInProgress);
  let currentFiber = workInProgress.firstEffect;
  while (currentFiber) {
    commitWork(currentFiber);
    currentFiber = currentFiber.nextEffect;
  }
  workInProgress = null;
}

function commitWork(currentFiber) {
  if (!currentFiber) {
    return;
  }
  let returnFiber = currentFiber.return;
  let returnDOM = returnFiber.stateNode;
  if (currentFiber.effectTag === PLACEMENT) {
    returnDOM.appendChild(currentFiber.stateNode);
  }
  currentFiber.effectTag = null;
}
```

## 第一次更新
### 完善deletions
