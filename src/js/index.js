"use strict"

const CELL_BG_ID = "cell_bg";
const CELL_GRID_ID = "cell_grid";
let dpr = window.devicePixelRatio; // 设备像素比
// 监听视图size改变
window.onresize = (e) => {
  dpr = window.devicePixelRatio;
  ce.drawGridBg();
}

class InitCE {
  constructor({ gridWidth, gridHeight, trNum, tdNum }) {
    this.canvas = null;
    this.ctx = null;  // canvas对象
    this.grid = null; // 选中的表格对象
    this.input = null; // input输入框dom
    this.inputValue = ''; // input内容
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.trNum = trNum + 1; // 行数
    this.tdNum = tdNum + 1; // 列数
    this.width = this.tdNum * gridWidth;
    this.height = this.trNum * gridHeight;
    this.table = []; // 存储每个格子信息
    this.isDragGrid = false; // 是否开启格子拖动事件
    this.dragRanksType = 0; // 行列拖拽：0-不拖拽，1-行拖拽，2-列拖拽
    this.checkedGrid = [1, 1]; // 当前选中格子[tr, td]
    this.offsetX = 0; // 当前鼠标x偏移位置
    this.offsetY = 0; // 当前鼠标y偏移位置
    this.scrollTop = 0; // 滚动位置
    this.scrollLeft = 0;
    this.gridHeader = {  // 表格固定栏
      tr: 0,
      td: 0,
      width: 100,
      height: 30,
    }
  }
  // 初始化
  create() {
    $('#ce').append(`<canvas id='${CELL_BG_ID}'></canvas>`);
    $(`#${CELL_BG_ID}`).css({
      top: 0,
      left: 0
    })
    this.canvas = $(`#${CELL_BG_ID}`)[0];
    if (this.canvas.getContext) {
      this.ctx = this.canvas.getContext("2d"); // 创建canvas对象
      // 监听点击事件
      for (let i = 0; i < this.trNum; i++) {
        // 添加行
        this.table[i] = [];
        for (let j = 0; j < this.tdNum; j++) {
          // 添加列
          this.table[i][j] = {
            tr: i,
            td: j,
            width: this.gridWidth,
            height: this.gridHeight,
            content: '',
          }

        }
      }
      this.onEventChange(this.ctx.canvas);
      // this.drawGridBg()
      this.handleClick({ tr: this.gridHeader.tr + 1, td: this.gridHeader.td + 1 });
      this.handleScrollEvents();

    }
  }
  // 添加列
  addCellCol() { }
  // 添加行
  addCellRow() { }
  // 绘制表格
  drawGridBg() {
    // 重新设置canvas自身宽高大小和css大小。放大 canvas, css 保持不变
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    if (this.canvas.getContext) {
      this.ctx = this.canvas.getContext("2d"); // 创建canvas对象
      this.ctx.scale(dpr, dpr); // 缩放每个绘制操作
      this.table.forEach((element, i) => {
        element.forEach((ve, j) => {
          this.gridBgStyle(i, j, ve);
        })
      });
    }
  }
  // 样式
  gridBgStyle(i, j, grid) {

    new Promise((resolve, reject) => {
      // 重置画笔
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = "#bbb";
      this.ctx.fillStyle = "#2b2b2b";
      // 绘制网格
      const { offsetXArr, offsetYArr } = getGridOffset(this.table);
      if (i === 0 && j >= this.gridHeader.td + 1) {
        // 绘制竖线
        this.ctx.beginPath();
        this.ctx.moveTo(offsetXArr[j] - this.ctx.lineWidth / 2, 0);
        this.ctx.lineTo(offsetXArr[j] - this.ctx.lineWidth / 2, this.height - this.gridHeader.height);
        this.ctx.stroke();
      }
      else if (j === 0 && i >= this.gridHeader.tr + 1) {
        // 绘制横线
        this.ctx.beginPath();
        this.ctx.moveTo(0, offsetYArr[i] - this.ctx.lineWidth / 2);
        this.ctx.lineTo(this.width - this.gridHeader.width, offsetYArr[i] - this.ctx.lineWidth / 2);
        this.ctx.stroke();
      }
      // 绘制文本
      this.drawAppendText(grid);
      resolve()
    }).then(() => {
      let drawHeaderTr = true, drawHeaderTd = true;
      if (this.dragRanksType) this.drawRanksLine();
      // 已选中表格格子
      if (i === this.checkedGrid[0] && j === this.checkedGrid[1]
        && (
          this.gridHeader.td !== i || this.gridHeader.tr !== j
        )) {
        // 设置已选中格子样式
        this.ctx.strokeStyle = "rgba(34, 115, 170, 1)";
        this.ctx.fillStyle = "rgba(34, 115, 170, 1)";
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([0]);
        const { x, y } = getGridOffset(this.table, ...this.checkedGrid);
        const grid = this.table[this.checkedGrid[0]][this.checkedGrid[1]];
        if (this.gridHeader.tr >= i || this.gridHeader.td >= j) {
          if (this.gridHeader.tr >= i) drawHeaderTd = false;
          if (this.gridHeader.td >= j) drawHeaderTr = false;
        } else {
          this.ctx.beginPath();
          this.ctx.moveTo(x - this.ctx.lineWidth, y - this.ctx.lineWidth / 2);
          this.ctx.lineTo(x + grid.width + this.ctx.lineWidth / 2 - 1, y - this.ctx.lineWidth / 2);
          this.ctx.lineTo(x + grid.width + this.ctx.lineWidth / 2 - 1, y + grid.height - 6);
          this.ctx.moveTo(x + grid.width - 6, y + this.ctx.lineWidth / 2 + grid.height - 1);
          this.ctx.lineTo(x - this.ctx.lineWidth / 2, y + this.ctx.lineWidth / 2 + grid.height - 1);
          this.ctx.lineTo(x - this.ctx.lineWidth / 2, y - this.ctx.lineWidth / 2);
          this.ctx.stroke();
          this.ctx.fillRect(
            x + grid.width - 4,
            y + grid.height - 4,
            8, 8
          )
        }
        // 对应行列样式
        const { x: hX, y: hY } = getGridOffset(this.table, this.gridHeader.tr + 1, this.gridHeader.td + 1);
        this.ctx.fillStyle = "rgba(0, 0, 200, 0.2)";
        if (drawHeaderTr) {
          this.ctx.fillRect(x, hY - this.gridHeader.height, grid.width, this.gridHeight); // 列首格背景
          this.ctx.beginPath();
          this.ctx.moveTo(x, hY - this.ctx.lineWidth / 2);
          this.ctx.lineTo(x + grid.width, hY - this.ctx.lineWidth / 2);
          this.ctx.stroke();
        }
        if (drawHeaderTd) {
          this.ctx.fillRect(hX - this.gridHeader.width, y, this.gridWidth, grid.height); // 行首格背景
          this.ctx.beginPath();
          this.ctx.moveTo(hX - this.ctx.lineWidth / 2, y);
          this.ctx.lineTo(hX - this.ctx.lineWidth / 2, y + grid.height);
          this.ctx.stroke();
        }

      }
    })

  }
  // 设置格子的样式
  drawCheckedGrid(options, tr, td) {
    if (tr === 0 || td === 0) return;
    const { lineWidth, strokeStyle } = options;

    if (tr !== this.checkedGrid[0] || td !== this.checkedGrid[1]) {
      // 当前设置的样式
      this.ctx.strokeStyle = strokeStyle;
      this.ctx.lineWidth = lineWidth;
      this.ctx.setLineDash([3]);
      const { x, y } = getGridOffset(this.table, tr, td);
      const curGrid = this.table[tr][td];
      this.ctx.strokeRect(
        x - lineWidth / 2,
        y - lineWidth / 2,
        curGrid.width + lineWidth - 1,
        curGrid.height + lineWidth - 1
      );
    }

  }
  // 添加文本
  drawAppendText(grid, options) {
    const { x, y } = getGridOffset(this.table, grid.tr, grid.td);
    this.ctx.font = '18px 微软雅黑';

    // 显示在textbaseline之上
    this.ctx.fillText(
      grid.content,
      x,
      y + grid.height - (options?.paddingBottom ?? 6)
    );

    if (grid.td === this.gridHeader.td + 1) {
      if (grid.tr === this.gridHeader.tr + 1) return; // 全表首格
      // 首列
      this.ctx.fillText(grid.tr - 1, textAlign({
        ctx: this.ctx,
        grid: this.gridHeader,
        x: x - this.gridHeader.width,
        text: grid.tr - 1
      }), textAlign({
        ctx: this.ctx,
        grid: this.gridHeader,
        y: y - this.gridHeader.height,
        text: grid.tr - 1
      }, 'vertical-center'))

    }
    if (grid.tr === this.gridHeader.tr + 1) {
      this.ctx.font = '20px 微软雅黑';
      this.ctx.fillText(fromCharCode(grid.td - 1), textAlign({
        ctx: this.ctx,
        grid: this.gridHeader,
        x: x - this.gridHeader.width,
        text: fromCharCode(grid.td - 1)
      }), textAlign({
        ctx: this.ctx,
        grid: this.gridHeader,
        y: y - this.gridHeader.height,
        text: fromCharCode(grid.td - 1)
      }, 'vertical-center'));

    }

  }
  // 绘制线条
  drawRanksLine() {
    this.ctx.setLineDash([2]);
    this.ctx.lineWidth = 1;
    this.ctx.fillStyle = "#666";
    if (this.dragRanksType === 2) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.offsetX, 0);
      this.ctx.lineTo(this.offsetX, this.height);
      this.ctx.stroke();
    } else if (this.dragRanksType === 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.offsetY);
      this.ctx.lineTo(this.width, this.offsetY);
      this.ctx.stroke();
    }
  }

  // 监听滚动
  handleScrollEvents() {
    let scrollTop = 0, scrollLeft = 0;

    this.canvas.addEventListener('wheel', (e) => {
      e = e || window.event;
      if (e) {
        scrollTop += e.wheelDeltaY * -1
        scrollLeft += e.wheelDeltaX * -1
        if (scrollTop <= 0) scrollTop = 0
        if (scrollLeft <= 0) scrollLeft = 0

        const { tr, td } = getGridRanks(this.table, { offsetX: scrollLeft, offsetY: scrollTop })
        this.gridHeader.tr = tr;
        this.gridHeader.td = td;

        $(`#${CELL_BG_ID}`).css({
          top: (getGridOffset(this.table, tr + 1, td + 1).y - this.gridHeader.height) * -1,
          left: (getGridOffset(this.table, tr + 1, td + 1).x - this.gridHeader.width) * -1
        })
        this.drawGridBg()

        // 阻止页面滚动
        e.preventDefault && e.preventDefault();
        return false;
      }
    })

  }
  // 删除input
  clearInput() {
    if (!this.input) return;
    $('#ce .ce-grid_input').remove();
    this.input = null;
    this.inputValue = '';
  }
  // 键盘输入事件
  handleKeydown(e, { tr, td }) {

    this.inputValue = this.input?.val();
    this.table[tr][td].content = this.inputValue ?? this.table[tr][td].content;

    switch (e.key) {
      case 'Enter':
      case 'ArrowDown':
        // 回车
        this.handleClick({ tr: (tr + 1) >= this.trNum ? this.trNum - 1 : tr + 1, td });
        this.clearInput();
        break;
      case 'ArrowRight':
        this.handleClick({ tr, td: (td + 1) >= this.tdNum ? this.tdNum - 1 : td + 1 });
        this.clearInput();
        break;
      case 'ArrowLeft':
        this.handleClick({ tr, td: (td - 1) >= 0 ? td - 1 : 0 });
        this.clearInput();
        break;
      case 'ArrowUp':
        this.handleClick({ tr: (tr - 1) >= 0 ? tr - 1 : 0, td });
        this.clearInput();
        break;
      default:
        this.handleDblclick({ tr, td });
    }
  }
  // 点击事件
  handleClick({ tr, td }) {

    if (tr === this.gridHeader.tr
      || td === this.gridHeader.td
      || td === this.tdNum - 1
      || tr === this.trNum - 1
    ) return;
    this.checkedGrid = [tr, td];
    this.clearInput();
    // 监听键盘 -- canvas onkeypress不起作用
    window.onkeydown = (e) => {
      this.handleKeydown(e, { tr, td });
    }

    // 重置画布: canvas高度重置会清空画布
    this.drawGridBg();
    this.drawCheckedGrid({
      lineWidth: 3,
      strokeStyle: "rgba(34, 115, 70, 1)"
    }, tr, td);

  }
  // 双击事件
  handleDblclick({ tr, td }) {
    if (tr === 0 || td === 0) return;
    const { x, y } = getGridOffset(this.table, tr - this.gridHeader.tr, td - this.gridHeader.td)
    const grid = this.table[tr][td];
    if (!this.input) {
      $('#ce').append(`
        <input type="text" class="ce-grid_input">
      `);
      this.input = $(`.ce-grid_input`);
      this.input.css({
        display: 'block',
        left: x,
        top: y,
        width: grid.width,
        height: grid.height,
      })
      this.input.focus(); // 主动聚焦
      this.input?.val(grid.content);
      // 监听失去焦点
      this.input.on('blur', () => {
        this.inputValue = this.input?.val();
        this.table[tr][td].content = this.inputValue;
        if (this.inputValue) this.clearInput();
      })
    }
  }
  // 拖动格子
  handleGridDrag({ tr, td }) {
    if (!this.isDragGrid) return;

    // 重置画布: canvas高度重置会清空画布
    this.drawGridBg();
    // 添加一个移动的虚框格子
    this.drawCheckedGrid({
      lineWidth: 3,
      strokeStyle: "#999"
    }, tr, td);
  }
  // 鼠标事件处理
  onEventChange(e) {
    const coefCount = 6;  // 触发鼠标改变范围因数
    let boundaryY, boundaryX, isBoundaryXY;

    // 鼠标按下与抬起
    e.onmousedown = (event) => {
      const { tr, td } = getGridRanks(this.table, {
        offsetX: event.offsetX,
        offsetY: event.offsetY
      })

      if (isBoundaryXY && tr === this.checkedGrid[0] && td === this.checkedGrid[1]) {
        // 开启格子拖动
        this.isDragGrid = true;

      } else if (tr === 0 && boundaryX < coefCount) {
        this.dragRanksType = 2;
      } else if (td === 0 && boundaryY < coefCount) {
        this.dragRanksType = 1;
      }

      e.onmouseup = (innerevent) => {
        const { tr: upTr, td: upTd } = getGridRanks(this.table, {
          offsetX: innerevent.offsetX,
          offsetY: innerevent.offsetY
        })

        if (tr === upTr && td === upTd) {
          // 点击事件
          this.handleClick({ tr, td });
        }
        if (this.isDragGrid) {
          this.table[upTr][upTd].content = this.table[tr][td].content;
          this.table[tr][td].content = '';
          // 结束拖动
          this.isDragGrid = false;
          this.handleClick({ tr: upTr, td: upTd });
        } else if (this.dragRanksType) {
          this.dragRanksType = 0;
          tableChangeRanksGetData(this.table, { tr, td, x: this.offsetX, y: this.offsetY });
          // 重置画布: canvas高度重置会清空画布
          this.drawGridBg();
        }

      }

    }
    // 双击
    e.ondblclick = (event) => {
      this.handleDblclick(
        getGridRanks(this.table, {
          offsetX: event.offsetX,
          offsetY: event.offsetY
        })
      )
    }
    e.onmousemove = (event) => {
      this.offsetY = event.offsetY;
      this.offsetX = event.offsetX;

      let cursor = 'auto';  // 鼠标样式

      const { tr, td } = getGridRanks(this.table, {
        offsetX: this.offsetX,
        offsetY: this.offsetY
      })

      const { x, y } = getGridOffset(this.table, tr, td)
      const grid = this.table[tr][td];
      if (grid) {
        boundaryX = x + grid.width - this.offsetX;
        boundaryY = y + grid.height - this.offsetY;
        isBoundaryXY = boundaryY < coefCount
          || boundaryY > grid.height - coefCount
          || boundaryX < coefCount
          || boundaryX > grid.width - coefCount;
        // 监听鼠标移动位置变化
        this.handleGridDrag({ tr, td });
        if (this.dragRanksType) this.drawGridBg();

        if (tr > 0 && td > 0) {
          // 当前选中元素
          if (
            (tr === this.checkedGrid[0]
              && td === this.checkedGrid[1]
              && isBoundaryXY
            ) || this.isDragGrid
          ) {
            cursor = 'move' // 拖动整个格子
          }
        }
        else if (td === 0 && boundaryY < coefCount) {
          cursor = 'row-resize' // 上下拖动
        }
        else if (tr === 0 && boundaryX < coefCount) {
          cursor = 'col-resize' // 左右拖动
        }

        $("canvas").css({
          cursor  // 移动光标
        })

      }


    }

  }

}


// 自适应线条长度
function adaptDPR(num) {
  const dpr = window.devicePixelRatio;
  if (dpr <= 1) {
    return num * dpr
  } else {
    return num
  }
}

// 文本位置
function textAlign({ ctx, grid, text, x, y }, align = 'horizontal-center') {

  const textWidth = ctx.measureText(text).width;
  const textHeight = ctx.measureText(text).fontBoundingBoxAscent
  // + ctx.measureText(text).fontBoundingBoxAscent;
  const halfTW = grid.width / 2 - textWidth / 2;
  const halfTH = grid.height / 2 + textHeight / 2;

  switch (align) {
    case 'horizontal-center':
      // 水平居中
      return x + halfTW;
    case 'vertical-center':
      // 垂直居中
      return y + halfTH;
  }
}

// 根据行列获取表格起始位置坐标
function getGridOffset(list, tr = null, td = null) {
  let offsetYArr = [], offsetXArr = [];
  list[0].reduce(
    // 累计各行起始x
    (pre, cur) => {
      offsetXArr.push(pre);
      return pre + cur.width;
    },
    0
  )
  // 累计各列起始y
  list.reduce(
    (pre, cur) => {
      return pre.concat(cur[0]);
    },
    []
  ).reduce(
    (pre, cur) => {
      offsetYArr.push(pre)
      return pre + cur.height;
    },
    0
  )
  if (tr === null || td === null) {
    return {
      offsetYArr,
      offsetXArr
    }
  }

  return {
    x: offsetXArr[td],
    y: offsetYArr[tr]
  }

}
// 根据列表数据获取行列
function getGridRanks(list, { offsetX, offsetY }) {
  if (list.length) {
    let width = 0, height = 0, tr = 0, td = 0;
    list[0].map((item, i) => {
      // 遍历第一行，获取x轴方向长度
      width += item.width;
      if (offsetX > width) {
        td = i + 1;
        return;
      };

    })
    list.map((item, i) => {
      // 遍历第一列，获取y轴方向位置
      item.map((itemv, j) => {
        if (j === 0) height += itemv.height;
        if (offsetY > height) {
          tr = i + 1;
          return;
        }
      })

    })
    if (tr >= list.length) tr = list.length - 1;
    if (td >= list[0].length) td = list[0].length - 1;
    return { tr, td };
  }
  return false;
}


// 表格行列宽度改变--重新设置表格数据
function tableChangeRanksGetData(table, {
  tr,
  td,
  x,
  y,
}, minWidth = 20, minHeight = 25) {
  let width = x - getGridOffset(table, 0, td).x;
  let height = y - getGridOffset(table, tr, 0).y;

  if (tr) {
    // 改变行宽
    table[tr].map(item => {
      if (height < minHeight) {
        item.height = minHeight;
      } else {
        item.height = height;
      }

    })
  } else if (td) {
    // 改变列宽
    table.map(item => {
      item.map((itemv, j) => {
        if (j === td) {
          if (width < minWidth) {
            itemv.width = minWidth;
          } else {
            itemv.width = width;
          }

        }
      })
    })
  }
}


// 转字符
function fromCharCode(ascii) {
  // A -- 65 ASCII码
  return String.fromCharCode(64 + ascii);
}

let ce = new InitCE({
  gridWidth: 100, // 初始化格子宽 / 高
  gridHeight: 30,
  trNum: 30,
  tdNum: 15,
});
