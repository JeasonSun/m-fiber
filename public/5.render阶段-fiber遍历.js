const rootFiber = require("./element");

function sleep(delay) {
  const startTime = Date.now();
  while (Date.now() - startTime < delay) {}
}

let nextUnitOfWork = null;

function workLoop(deadline) {
  while (
    nextUnitOfWork &&
    (deadline.timeRemaining() > 0 || deadline.didTimeout)
  ) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }
  if (!nextUnitOfWork) {
    console.log("render阶段结束");
  } else {
    requestIdleCallback(workLoop, { timeout: 1000 });
  }
}

function performUnitOfWork(fiber) {
  beginWork(fiber);
  if (fiber.child) {
    return fiber.child;
  }
  // 如果fiber没有child了， 那就找兄弟
  while (fiber) {
    debugger;
    completeUnitOfWork(fiber);

    if (fiber.sibling) {
      return fiber.sibling;
    }
    fiber = fiber.return;
  }
}

function beginWork(fiber) {
  console.log("开始", fiber.key);
  sleep(20);
}

function completeUnitOfWork(fiber) {
  console.log("结束", fiber.key);
}

/***********  执行 **********/

nextUnitOfWork = rootFiber;
// workLoop();

requestIdleCallback(workLoop, { timeout: 1000 });
