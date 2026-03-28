// ── Service Worker 注册（提供缓存，避免重复加载瓦片/图标） ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}


const TILE='https://ogmods.github.io/dysmantle-map/tiles/{z}/{x}/{y}.jpg';
const IBASE='https://ogmods.github.io/dysmantle-map/images/icons/';
const NZ=5,R=12.8;

const map=L.map('map',{crs:L.CRS.Simple,maxZoom:7,minZoom:1,maxBounds:[[0,0],[-384,768]],maxBoundsViscosity:.7,attributionControl:false,zoomControl:true});
map.fitBounds([[-384,0],[0,768]]);
map.zoomControl.setPosition('bottomright');
const tileMain=L.tileLayer(TILE,{maxNativeZoom:NZ,minNativeZoom:1,tms:false,bounds:[[-384,0],[0,768]],
  errorTileUrl:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}).addTo(map);
// 地下城地图配置（参考 OGMods 官方：maxBoundsUndercrown = [[0,0],[(9*-8),(14*8)]]）
const TILE_UC='https://ogmods.github.io/dysmantle-map/tiles_undercrown/{z}/{x}/{y}.jpg';
const UC_BOUNDS=[[0,0],[-72,112]];
const tileUC=L.tileLayer(TILE_UC,{maxNativeZoom:NZ,minNativeZoom:3,tms:false,bounds:UC_BOUNDS,
  errorTileUrl:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'});
// DLC 地图配置（参考 OGMods 官方 bounds）
const DLC1_BOUNDS=[[0,0],[-184,352]]; // (23*-8, 44*8)
const DLC2_BOUNDS=[[0,0],[-184,376]]; // (23*-8, 47*8)
const DLC3_BOUNDS=[[0,0],[-96,192]];  // (12*-8, 24*8)
const tileDLC1=L.tileLayer('https://ogmods.github.io/dysmantle-map/tiles_dlc1/{z}/{x}/{y}.jpg',
  {maxNativeZoom:NZ,minNativeZoom:3,tms:false,bounds:DLC1_BOUNDS,
  errorTileUrl:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'});
const tileDLC2=L.tileLayer('https://ogmods.github.io/dysmantle-map/tiles_dlc2/{z}/{x}/{y}.jpg',
  {maxNativeZoom:NZ,minNativeZoom:3,tms:false,bounds:DLC2_BOUNDS,
  errorTileUrl:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'});
const tileDLC3=L.tileLayer('https://ogmods.github.io/dysmantle-map/tiles_dlc3/{z}/{x}/{y}.jpg',
  {maxNativeZoom:NZ,minNativeZoom:3,tms:false,bounds:DLC3_BOUNDS,
  errorTileUrl:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'});
// Zoom-responsive icon sizing
// Zoom-reactive icon sizing via CSS custom property + zoom class on map container
function updateZoomClass(){
  const z=map.getZoom();
  const mc=document.getElementById('map');
  mc.className=mc.className.replace(/\bzoom-lv\d+\b/g,'').trim();
  mc.classList.add('zoom-lv'+z);
}
map.on('zoomend',updateZoomClass);
updateZoomClass();

let currentMap='island';
map.on('mousemove',e=>{
  const pt=map.project(e.latlng,NZ);
  const lx=Math.round(pt.x/R),ly=Math.round(pt.y/R);
  const mapLabels={island:'',undercrown:` [地下城]`,dlc1:` [冥界]`,dlc2:` [末日]`,dlc3:` [宠物地下城]`};
  const offsets={island:[0,0],undercrown:[840,300],dlc1:[40,0],dlc2:[0,0],dlc3:[0,0]};
  const [ox,oy]=offsets[currentMap]||[0,0];
  document.getElementById('coordDisplay').textContent=`坐标: ${lx+ox}°, ${ly+oy}°${mapLabels[currentMap]||''}`;
});
function g2l(gx,gy){return map.unproject([gx*R,gy*R],NZ);}
// 地下城坐标转换：官方 tile_x=(gx-840)*R, tile_y=(gy-300)*R
function g2l_uc(gx,gy){return map.unproject([(gx-840)*R,(gy-300)*R],NZ);}
// DLC1 坐标偏移 x+40（冥界）；DLC2/DLC3 无偏移，直接用 g2l
function g2l_dlc1(gx,gy){return map.unproject([(gx-40)*R,gy*R],NZ);}
// 获取当前地图的坐标转换函数
function g2l_curr(gx,gy){
  if(currentMap==='undercrown')return g2l_uc(gx,gy);
  if(currentMap==='dlc1')return g2l_dlc1(gx,gy);
  return g2l(gx,gy); // island, dlc2, dlc3 均无额外偏移
}

// ── Icon factory ──
// Real ogmods PNG icons, sized 32×32 base; CSS zoom classes scale them
const IC={};
function mkIcon(name,color){
  const k=name+color;if(IC[k])return IC[k];
  return IC[k]=L.divIcon({
    className:'dysmap-icon',
    html:`<div style="filter:drop-shadow(0 0 3px ${color}99) drop-shadow(0 1px 5px rgba(0,0,0,.9));width:32px;height:32px;">
      <img src="${IBASE}${name}.png" width="32" height="32"
        style="image-rendering:pixelated;display:block;"
        onerror="this.src='${IBASE}icon-unknown.png'"/>
    </div>`,
    iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-20]
  });
}

// ── Region borders ──
const RPOLYS=[
  {cn:"迦百农",en:"Capernaum",color:"#e8a020",pts:[[-200,520],[-192,520],[-192,584],[-216,584],[-216,576],[-232,576],[-232,528],[-224,528],[-224,520]],cx:548.4,cy:-214.2},
  {cn:"卡纳维拉尔",en:"Canaveral",color:"#4cc9f0",pts:[[-224,584],[-224,576],[-216,576],[-216,584],[-184,584],[-184,592],[-168,592],[-168,616],[-176,616],[-176,624],[-168,624],[-168,632],[-160,632],[-160,640],[-152,640],[-152,720],[-144,720],[-144,736],[-136,736],[-136,768],[-288,768],[-288,704],[-280,704],[-280,688],[-272,688],[-272,656],[-264,656],[-264,648],[-256,648],[-256,640],[-248,640],[-248,624],[-240,624],[-240,592],[-232,592],[-232,584]],cx:645.8,cy:-211.6},
  {cn:"柴火",en:"Fairwood",color:"#86efac",pts:[[-104,456],[-96,456],[-96,472],[-104,472],[-104,488],[-112,488],[-112,496],[-128,496],[-128,504],[-136,504],[-136,520],[-128,520],[-128,536],[-120,536],[-120,568],[-128,568],[-128,584],[-120,584],[-120,624],[-128,624],[-128,632],[-152,632],[-152,640],[-160,640],[-160,632],[-168,632],[-168,624],[-176,624],[-176,616],[-168,616],[-168,592],[-184,592],[-184,584],[-192,584],[-192,520],[-216,520],[-216,512],[-200,512],[-200,496],[-192,496],[-192,480],[-176,480],[-176,472],[-168,472],[-168,464],[-120,464],[-120,456]],cx:542.1,cy:-150.0},
  {cn:"篱笆地",en:"Hedgefield",color:"#6ee7b7",pts:[[-264,472],[-256,472],[-256,480],[-240,480],[-240,488],[-232,488],[-232,496],[-224,496],[-224,504],[-216,504],[-216,520],[-224,520],[-224,528],[-232,528],[-232,576],[-224,576],[-224,584],[-232,584],[-232,592],[-240,592],[-240,624],[-248,624],[-248,640],[-256,640],[-256,648],[-264,648],[-264,632],[-272,632],[-272,616],[-280,616],[-280,592],[-288,592],[-288,568],[-312,568],[-312,560],[-336,560],[-336,536],[-328,536],[-328,528],[-320,528],[-320,520],[-304,520],[-304,512],[-296,512],[-296,496],[-280,496],[-280,488],[-272,488],[-272,472]],cx:548.4,cy:-265.6},
  {cn:"沼泽草地",en:"Everglade",color:"#34d399",pts:[[-320,560],[-312,560],[-312,568],[-288,568],[-288,592],[-280,592],[-280,616],[-272,616],[-272,632],[-264,632],[-264,656],[-272,656],[-272,688],[-280,688],[-280,704],[-288,704],[-288,768],[-384,768],[-384,576],[-368,576],[-368,568],[-344,568],[-344,560]],cx:626.8,cy:-305.4},
  {cn:"北欧化工",en:"Borealis",color:"#67e8f9",pts:[[-8,464],[0,464],[0,616],[-24,616],[-24,608],[-72,608],[-72,592],[-120,592],[-120,584],[-128,584],[-128,568],[-120,568],[-120,536],[-128,536],[-128,520],[-136,520],[-136,504],[-128,504],[-128,496],[-112,496],[-112,488],[-104,488],[-104,472],[-64,472],[-64,464]],cx:534.4,cy:-91.2},
  {cn:"大角星",en:"Arcturus",color:"#93c5fd",pts:[[-80,592],[-72,592],[-72,608],[-24,608],[-24,616],[0,616],[0,768],[-136,768],[-136,736],[-144,736],[-144,720],[-152,720],[-152,632],[-128,632],[-128,624],[-120,624],[-120,592]],cx:657.9,cy:-96.0},
  {cn:"爱尔兰",en:"Hibernus",color:"#a3e635",pts:[[-8,376],[0,376],[0,464],[-64,464],[-64,472],[-96,472],[-96,456],[-120,456],[-120,464],[-184,464],[-184,448],[-176,448],[-176,440],[-160,440],[-160,416],[-152,416],[-152,408],[-136,408],[-136,392],[-128,392],[-128,384],[-112,384],[-112,392],[-56,392],[-56,384],[-16,384],[-16,376]],cx:421.0,cy:-104.0},
  {cn:"峡谷",en:"Narrows Vale",color:"#fb923c",pts:[[-224,312],[-224,304],[-216,304],[-216,336],[-208,336],[-208,344],[-216,344],[-216,376],[-224,376],[-224,432],[-216,432],[-216,456],[-224,456],[-224,464],[-232,464],[-232,488],[-240,488],[-240,480],[-256,480],[-256,472],[-272,472],[-272,488],[-280,488],[-280,496],[-288,496],[-288,464],[-280,464],[-280,440],[-288,440],[-288,408],[-280,408],[-280,400],[-272,400],[-272,376],[-264,376],[-264,368],[-256,368],[-256,352],[-248,352],[-248,344],[-240,344],[-240,320],[-232,320],[-232,312]],cx:405.5,cy:-248.0},
  {cn:"夕阳沙漠",en:"Sunburn Desert",color:"#fbbf24",pts:[[-368,168],[-360,168],[-360,176],[-344,176],[-344,184],[-320,184],[-320,192],[-296,192],[-296,200],[-288,200],[-288,208],[-280,208],[-280,216],[-272,216],[-272,232],[-264,232],[-264,248],[-256,248],[-256,264],[-248,264],[-248,272],[-240,272],[-240,264],[-232,264],[-232,256],[-224,256],[-224,264],[-216,264],[-216,304],[-224,304],[-224,312],[-232,312],[-232,320],[-240,320],[-240,344],[-248,344],[-248,352],[-256,352],[-256,368],[-264,368],[-264,376],[-280,376],[-280,384],[-288,384],[-288,392],[-304,392],[-304,384],[-312,384],[-312,376],[-320,376],[-320,368],[-328,368],[-328,360],[-368,360],[-368,352],[-384,352],[-384,168]],cx:288.4,cy:-283.2},
  {cn:"蛇工",en:"Serpent's Crossing",color:"#f87171",pts:[[-376,352],[-368,352],[-368,360],[-328,360],[-328,368],[-320,368],[-320,376],[-312,376],[-312,384],[-304,384],[-304,392],[-288,392],[-288,384],[-280,384],[-280,376],[-272,376],[-272,400],[-280,400],[-280,408],[-288,408],[-288,440],[-280,440],[-280,464],[-288,464],[-288,496],[-296,496],[-296,512],[-304,512],[-304,520],[-320,520],[-320,528],[-328,528],[-328,536],[-336,536],[-336,560],[-344,560],[-344,568],[-368,568],[-368,576],[-384,576],[-384,352]],cx:447.6,cy:-315.9},
  {cn:"中枢",en:"Central",color:"#c084fc",pts:[[-136,208],[-128,208],[-128,224],[-136,224],[-136,248],[-128,248],[-128,296],[-136,296],[-136,304],[-144,304],[-144,336],[-160,336],[-160,344],[-184,344],[-184,336],[-216,336],[-216,264],[-208,264],[-208,248],[-216,248],[-216,216],[-200,216],[-200,224],[-152,224],[-152,208]],cx:268.2,cy:-166.1},
  {cn:"北极星",en:"Polaris",color:"#e0f2fe",pts:[[-8,112],[0,112],[0,288],[-8,288],[-8,296],[-24,296],[-24,304],[-32,304],[-32,312],[-80,312],[-80,320],[-96,320],[-96,312],[-112,312],[-112,304],[-120,304],[-120,296],[-128,296],[-128,248],[-136,248],[-136,224],[-128,224],[-128,208],[-120,208],[-120,184],[-112,184],[-112,176],[-88,176],[-88,168],[-80,168],[-80,152],[-72,152],[-72,144],[-64,144],[-64,136],[-40,136],[-40,128],[-24,128],[-24,112]],cx:224.0,cy:-75.3},
  {cn:"西港",en:"Westport",color:"#fda4af",pts:[[-152,88],[-152,80],[-144,80],[-144,88],[-136,88],[-136,128],[-128,128],[-128,152],[-112,152],[-112,168],[-104,168],[-104,176],[-112,176],[-112,184],[-120,184],[-120,208],[-152,208],[-152,224],[-200,224],[-200,216],[-216,216],[-216,208],[-208,208],[-208,184],[-216,184],[-216,176],[-232,176],[-232,144],[-224,144],[-224,112],[-200,112],[-200,104],[-192,104],[-192,96],[-176,96],[-176,88]],cx:152.0,cy:-168.0},
  {cn:"王冠",en:"Crown",color:"#f9a8d4",pts:[[-192,336],[-184,336],[-184,344],[-152,344],[-152,368],[-144,368],[-144,376],[-128,376],[-128,392],[-136,392],[-136,408],[-152,408],[-152,416],[-160,416],[-160,440],[-176,440],[-176,448],[-184,448],[-184,464],[-168,464],[-168,472],[-176,472],[-176,480],[-192,480],[-192,496],[-200,496],[-200,512],[-216,512],[-216,504],[-224,504],[-224,496],[-232,496],[-232,464],[-224,464],[-224,456],[-216,456],[-216,432],[-224,432],[-224,376],[-216,376],[-216,344],[-208,344],[-208,336]],cx:427.5,cy:-186.4},
  {cn:"冰霜",en:"Frore",color:"#bfdbfe",pts:[[-8,296],[-8,288],[0,288],[0,376],[-16,376],[-16,384],[-56,384],[-56,392],[-112,392],[-112,384],[-128,384],[-128,376],[-144,376],[-144,368],[-152,368],[-152,344],[-160,344],[-160,336],[-144,336],[-144,304],[-136,304],[-136,296],[-120,296],[-120,304],[-112,304],[-112,312],[-96,312],[-96,320],[-80,320],[-80,312],[-32,312],[-32,304],[-24,304],[-24,296]],cx:335.1,cy:-89.4},
  {cn:"冰霜号角",en:"Frost Horn",color:"#a5f3fc",pts:[[-8,0],[0,0],[0,112],[-24,112],[-24,128],[-40,128],[-40,136],[-64,136],[-64,144],[-72,144],[-72,152],[-80,152],[-80,168],[-88,168],[-88,176],[-104,176],[-104,168],[-112,168],[-112,152],[-128,152],[-128,128],[-136,128],[-136,88],[-144,88],[-144,72],[-136,72],[-136,64],[-128,64],[-128,48],[-120,48],[-120,32],[-112,32],[-112,24],[-104,24],[-104,0]],cx:102.4,cy:-91.2},
  {cn:"瓦肯镇",en:"Vulcan",color:"#fca5a5",pts:[[-112,0],[-104,0],[-104,24],[-112,24],[-112,32],[-120,32],[-120,48],[-128,48],[-128,64],[-136,64],[-136,72],[-144,72],[-144,80],[-152,80],[-152,88],[-176,88],[-176,96],[-192,96],[-192,104],[-200,104],[-200,112],[-224,112],[-224,120],[-232,120],[-232,104],[-240,104],[-240,88],[-248,88],[-248,80],[-256,80],[-256,56],[-264,56],[-264,32],[-272,32],[-272,16],[-280,16],[-280,8],[-288,8],[-288,0]],cx:62.8,cy:-196.1},
  {cn:"索拉里斯星",en:"Solaris",color:"#fde68a",pts:[[-296,0],[-288,0],[-288,8],[-280,8],[-280,16],[-272,16],[-272,32],[-264,32],[-264,56],[-256,56],[-256,80],[-248,80],[-248,88],[-240,88],[-240,104],[-232,104],[-232,120],[-224,120],[-224,144],[-232,144],[-232,176],[-216,176],[-216,184],[-208,184],[-208,208],[-216,208],[-216,248],[-208,248],[-208,264],[-224,264],[-224,256],[-232,256],[-232,264],[-240,264],[-240,272],[-248,272],[-248,264],[-256,264],[-256,248],[-264,248],[-264,232],[-272,232],[-272,216],[-280,216],[-280,208],[-288,208],[-288,200],[-296,200],[-296,192],[-320,192],[-320,184],[-344,184],[-344,176],[-360,176],[-360,168],[-384,168],[-384,0]],cx:161.7,cy:-264.6},
];
const regionBorderGroup=L.layerGroup().addTo(map);
RPOLYS.forEach(rp=>{
  L.polygon(rp.pts,{color:rp.color,fill:false,weight:1.5,opacity:0.55,interactive:false}).addTo(regionBorderGroup);
  const cx=rp.cx,cy=rp.cy;
  L.marker([cy,cx],{icon:L.divIcon({className:'region-label',
    html:`<div style="color:${rp.color};opacity:.65;font-size:11px;font-family:'Rajdhani',sans-serif;font-weight:700;text-shadow:0 1px 4px rgba(0,0,0,1);white-space:nowrap;pointer-events:none;">${rp.cn}</div>`,
    iconAnchor:[30,8]}),interactive:false}).addTo(regionBorderGroup);
});

// ════════════════════════════════════════════════
// QUEST DATABASE WITH LOCATIONS
// Each quest has:
//   locs: array of { label, gx, gy, type }
//   type: 'start'=接取点(橙), 'key'=关键地点(蓝), 'end'=完成/奖励(绿), 'boss'=BOSS(红), 'dig'=挖掘(黄)
// ════════════════════════════════════════════════
const QD={
  q_crowbar:{t:'side',n:'撬棍摧毁障碍物',en:'Crowbar Through Obstacles',
    s:['找废金属×2、废木料×5','在营火升级撬棍','摧毁堵住门口的柜子（1335°,537°）'],rw:'600 XP',
    locs:[{label:'接取任务',gx:1335,gy:540,tp:'start'},{label:'摧毁柜子',gx:1335,gy:537,tp:'end'}]},
  q_basic:{t:'side',n:'初级必需品',en:'Basic Necessities',
    s:['找到链塔(1391°,527°)','升级背包（植物物质×10，废织物×4）','提升人物等级'],rw:'1000 XP',
    locs:[{label:'接取任务',gx:1365,gy:518,tp:'start'},{label:'迦百农链塔',gx:1391,gy:527,tp:'key'}]},
  q_stronger:{t:'side',n:'变强',en:'Getting Stronger',
    s:['制作烹饪锅','烹饪番茄汤（菜谱在1371°,513°）','发明飞刀'],rw:'1500 XP',
    locs:[{label:'接取任务',gx:1419,gy:514,tp:'start'},{label:'番茄汤菜谱位置',gx:1371,gy:513,tp:'key'}]},
  q_basketball:{t:'side',n:'棒球',en:'Fast Basketball',
    s:['在迦百农1362°,537°接取任务','60秒内击败5个敌人'],rw:'3000 XP',
    locs:[{label:'接取任务 / 战斗区域',gx:1362,gy:537,tp:'start'}]},
  q_buried:{t:'side',n:'埋藏宝藏',en:'Buried Treasures',
    s:['在1425°,537°接任务获取藏宝地图','挖掘1430°,533°','挖掘1413°,548°'],rw:'3500 XP',
    locs:[{label:'接取任务',gx:1425,gy:537,tp:'start'},{label:'宝藏挖掘点A',gx:1430,gy:533,tp:'dig'},{label:'宝藏挖掘点B',gx:1413,gy:548,tp:'dig'}]},
  q_farming:{t:'side',n:'初级农作物',en:'Farming Basics',
    s:['发明种子袋（LV.5）','种植种子（箱内有玉米×4）','收获农作物'],rw:'4500 XP',
    locs:[{label:'接取任务 / 农场',gx:1484,gy:463,tp:'start'},{label:'玉米箱子',gx:1488,gy:465,tp:'key'}]},
  q_building:{t:'key',n:'建筑工程',en:'Construction Work',
    s:['发明建筑工具（LV.9）','建造3×3混泥土平台+台阶','建造木质门道×1、木墙窗×2、木墙×9','建造木椅×1、圆形餐桌×1、金属框架床×1','建造装饰×3','建造木门×1（需稀有木材）'],rw:'归家传送门秘诀 + 1500 XP',
    locs:[{label:'接取任务（白纸般的心灵）',gx:1605,gy:457,tp:'start'}]},
  q_fishing:{t:'side',n:'钓鱼',en:'Fish You Were Here',
    s:['发明鱼竿（LV.6，废木料×16、废织物×8、废金属×5）','钓3条鱼（任何钓点均可）'],rw:'4500 XP',
    locs:[{label:'接取任务',gx:1299,gy:377,tp:'start'},{label:'钓鱼点',gx:1290,gy:358,tp:'key'}]},
  q_haymaker:{t:'side',n:'干草机',en:'Haymaker',
    s:['在柴火孤独牧场1431°,451°接取','75秒内击败6个敌人'],rw:'5000 XP',
    locs:[{label:'接取任务 / 战斗区域',gx:1431,gy:451,tp:'start'}]},
  q_shipment:{t:'side',n:'运输',en:'Phony Shipment',
    s:['在柴火路边病房1252°,400°接取','找路边病房贮存钥匙（1214°,364°）','打开1247°,401°上锁的门'],rw:'5000 XP',
    locs:[{label:'接取任务',gx:1252,gy:400,tp:'start'},{label:'贮存钥匙位置',gx:1214,gy:364,tp:'key'},{label:'上锁的门',gx:1247,gy:401,tp:'end'}]},
  q_terminal_n:{t:'key',n:'破碎的北航站楼',en:'Broken Northern Terminal',
    s:['在1175°,369°接取任务','带废弃电子×8、橡胶×5','修理1172°,369°处的终端','完成后打开大门进入爱尔兰'],rw:'8500 XP（解锁爱尔兰）',
    locs:[{label:'接取任务',gx:1175,gy:369,tp:'start'},{label:'修理终端',gx:1172,gy:369,tp:'end'}]},
  q_graveyard:{t:'side',n:'墓地',en:'Graveyard Shift',
    s:['在篱笆地守墓人家1487°,626°接取','在1479°,637°铁锹挖掘找墓地钥匙','打开1467°,630°的大门'],rw:'6000 XP',
    locs:[{label:'接取任务（守墓人家）',gx:1487,gy:626,tp:'start'},{label:'挖掘墓地钥匙',gx:1479,gy:637,tp:'dig'},{label:'打开大门',gx:1467,gy:630,tp:'end'}]},
  q_plague:{t:'side',n:'瘟疫',en:'Mortar And Pestilence',
    s:['在沼泽草地1602°,749°接取','80秒内击败5个敌人'],rw:'5500 XP',
    locs:[{label:'接取任务 / 战斗区域',gx:1602,gy:749,tp:'start'}]},
  q_wolves:{t:'side',n:'猎狼',en:'Wolves Hunt In Packs',
    s:['在北欧化工1298°,255°接取','65秒内击败4个敌人'],rw:'5500 XP',
    locs:[{label:'接取任务 / 战斗区域',gx:1298,gy:255,tp:'start'}]},
  q_prison:{t:'key',n:'闯入监狱',en:'Prison Break-In',
    s:['在北欧化工1427°,144°接取','在1430°,146°找到线索','前往柴火警察局1522°,363°取北欧化工钥匙','返回进入1425°,143°监狱（深处有燃料电池）'],rw:'15000 XP',
    locs:[{label:'接取任务',gx:1427,gy:144,tp:'start'},{label:'线索位置',gx:1430,gy:146,tp:'key'},{label:'柴火警察局（取钥匙）',gx:1522,gy:363,tp:'key'},{label:'监狱入口（燃料电池）',gx:1425,gy:143,tp:'end'}]},
  q_northern:{t:'side',n:'北境人气',en:'Only A Northern Throng',
    s:['在大角星1610°,271°接取','75秒内击败5个敌人'],rw:'5000 XP',
    locs:[{label:'接取任务 / 战斗区域',gx:1610,gy:271,tp:'start'}]},
  q_trash:{t:'side',n:'无尽垃圾',en:'Endless Trash',
    s:['在爱尔兰大陆餐厅1121°,351°接取','搜索1117°,351°蓝色垃圾','搜索1116°,317°轮胎','挖掘1009°,290°取钥匙','打开1125°,354°的门'],rw:'12300 XP',
    locs:[{label:'接取任务（大陆餐厅）',gx:1121,gy:351,tp:'start'},{label:'蓝色垃圾',gx:1117,gy:351,tp:'key'},{label:'轮胎',gx:1116,gy:317,tp:'key'},{label:'挖掘取钥匙',gx:1009,gy:290,tp:'dig'},{label:'打开此门',gx:1125,gy:354,tp:'end'}]},
  q_sawmill:{t:'side',n:'初级锯木厂',en:'Sawmill Building Basics',
    s:['建造一座锯木厂（铁×20、橡胶×8、废弃电子×5）','可在任何首次遇到的锯木厂激活'],rw:'10000 XP',
    locs:[{label:'接取任务（爱尔兰锯木厂）',gx:1044,gy:237,tp:'start'}]},
  q_bridge:{t:'side',n:'天桥',en:'A Bridge Too Far',
    s:['在爱尔兰1061°,223°接取','锯木厂合成稀有木材×6','修复1065°,222°处的桥梁'],rw:'17500 XP',
    locs:[{label:'接取任务',gx:1061,gy:223,tp:'start'},{label:'锯木厂',gx:1044,gy:237,tp:'key'},{label:'修复桥梁',gx:1065,gy:222,tp:'end'}]},
  q_terminal_s:{t:'key',n:'损坏的南方终端',en:'Broken Southern Terminal',
    s:['在峡谷1194°,652°接取（城墙保存点Rho）','带废弃电子×5、橡胶×8','修理终端（打开大门进入峡谷后续区域）'],rw:'8500 XP（解锁峡谷）',
    locs:[{label:'接取任务',gx:1194,gy:652,tp:'start'},{label:'修理终端 / 大门',gx:1172,gy:652,tp:'end'}]},
  q_getaway:{t:'side',n:'逃跑路径',en:'Getaway Cut Short',
    s:['在峡谷1153°,668°接取','办公室1150°,675°找"房间号4"提示','4号房间1166°,672°找提示','马桶1148°,679°取汽车旅馆钥匙','检查停车场1089°,638°广告牌','海上救助1089°,611°查看提示','搜索1101°,589°橙色面包车→武士刀秘诀'],rw:'武士刀秘诀 + 21500 XP',
    locs:[{label:'接取任务',gx:1153,gy:668,tp:'start'},{label:'①办公室（找提示）',gx:1150,gy:675,tp:'key'},{label:'②4号房间（找提示）',gx:1166,gy:672,tp:'key'},{label:'③马桶（取钥匙）',gx:1148,gy:679,tp:'key'},{label:'④停车场广告牌',gx:1089,gy:638,tp:'key'},{label:'⑤海上救助（查看提示）',gx:1089,gy:611,tp:'key'},{label:'⑥橙色面包车（武士刀秘诀）',gx:1101,gy:589,tp:'end'}]},
  q_snowfield:{t:'side',n:'雪地',en:'You Rip What You Sow',
    s:['在峡谷997°,648°接取','通过陷阱小路找农场避难所','阅读991°,594°墙上提示','挖掘4棵头骨树'],rw:'9000 XP',
    locs:[{label:'接取任务',gx:997,gy:648,tp:'start'},{label:'农场避难所（阅读提示）',gx:991,gy:594,tp:'key'},{label:'头骨树挖掘①',gx:1091,gy:563,tp:'dig'},{label:'头骨树挖掘②',gx:1093,gy:551,tp:'dig'},{label:'头骨树挖掘③',gx:1100,gy:561,tp:'dig'},{label:'头骨树挖掘④',gx:1104,gy:567,tp:'dig'}]},
  q_brokentwr:{t:'side',n:'破碎链塔',en:'Broken Link Tower',
    s:['在峡谷1052°,599°接取','前往钢铁工厂（878°,598°）','冶金厂合成钛×10、钢×10','修理链塔（1048°,597°）'],rw:'5000 XP',
    locs:[{label:'接取任务',gx:1052,gy:599,tp:'start'},{label:'钢铁工厂（冶金厂）',gx:878,gy:598,tp:'key'},{label:'修理链塔',gx:1048,gy:597,tp:'end'}]},
  q_smelter:{t:'side',n:'初级冶金厂',en:'Smelter Building Basics',
    s:['建造一座冶金厂（钢铁厂）','主岛位置：878°,598°','可在任何首次遇到的冶金厂激活'],rw:'10000 XP',
    locs:[{label:'接取任务（钢铁工厂）',gx:878,gy:598,tp:'start'}]},
  q_voyage:{t:'side',n:'返航',en:'Con Voyage',
    s:['阅读皮玛村庄提示板824°,656°','到775°,697°与吉普车互动','找失落车队735°,697°','搜索3辆面包车，查看轨迹725°,700°','搜索782°,779°车辆→神力碎片'],rw:'神力碎片×1 + 10000 XP',
    locs:[{label:'接取任务（皮玛村提示板）',gx:824,gy:656,tp:'start'},{label:'①与吉普车互动',gx:775,gy:697,tp:'key'},{label:'②失落车队',gx:735,gy:697,tp:'key'},{label:'③查看轨迹',gx:725,gy:700,tp:'key'},{label:'④搜索车辆（神力碎片）',gx:782,gy:779,tp:'end'}]},
  q_nowhere:{t:'key',n:'无路可走',en:'On The Track To Nowhere',
    s:['在夕阳沙漠639°,650°接取','完成第一次远征（防毒面具）+ 天路 + 北极快递','煤气店570°,593°阅读提示','577°,567°取火车部件','修理637°,647°火车','坐火车至索拉里斯南部','点燃士兵火车站营火283°,610°'],rw:'22000 XP（解锁索拉里斯南部）',
    locs:[{label:'接取任务',gx:639,gy:650,tp:'start'},{label:'煤气店（阅读提示）',gx:570,gy:593,tp:'key'},{label:'取火车部件',gx:577,gy:567,tp:'key'},{label:'修理火车',gx:637,gy:647,tp:'key'},{label:'点燃营火（任务完成）',gx:283,gy:610,tp:'end'}]},
  q_money:{t:'side',n:'金钱',en:'Dirty Money',
    s:['阅读565°,737°桌子上的信件','前往553°,699°照片地点','找枯树533°,730°','挖掘570°,714°宝藏'],rw:'20000 XP',
    locs:[{label:'接取任务（阅读信件）',gx:565,gy:737,tp:'start'},{label:'①照片地点',gx:553,gy:699,tp:'key'},{label:'②枯树',gx:533,gy:730,tp:'key'},{label:'③宝藏挖掘',gx:570,gy:714,tp:'dig'}]},
  q_expedition:{t:'key',n:'第一次远征',en:'The First Expedition',
    s:['到达愚人峡谷899°,744°（第1处音频日志）','依次收听9处音频日志','利用机关1103°,848°打开大门','击败火山口神殿BOSS老冠军','搜索防毒面具秘诀（1305°,852°附近）'],rw:'防毒面具秘诀 + 15000 XP',
    locs:[{label:'接取任务',gx:898,gy:752,tp:'start'},{label:'音频日志①',gx:899,gy:744,tp:'key'},{label:'音频日志②',gx:930,gy:745,tp:'key'},{label:'音频日志③',gx:949,gy:744,tp:'key'},{label:'远征营地（日志④）',gx:945,gy:824,tp:'key'},{label:'遗址B（日志⑤）',gx:1014,gy:867,tp:'key'},{label:'庙宇通道（日志⑥）',gx:1087,gy:843,tp:'key'},{label:'机关（开门）',gx:1103,gy:848,tp:'key'},{label:'日志⑦',gx:1175,gy:858,tp:'key'},{label:'日志⑧',gx:1275,gy:867,tp:'key'},{label:'BOSS：老冠军',gx:1300,gy:824,tp:'boss'},{label:'防毒面具秘诀',gx:1305,gy:852,tp:'end'}]},
  q_laststand:{t:'side',n:'最终坚守',en:'The Last Stand',
    s:['装备防毒面具进入中枢触发任务','进入先驱公园（720°,438°入口）','在760°,439°阅读提示','取市政厅钥匙828°,440°','使用钥匙打开825°,433°的门','击败BOSS Skinless Skulkers'],rw:'锤子秘诀 + 36800 XP',
    locs:[{label:'任务触发点（扬声器）',gx:815,gy:396,tp:'start'},{label:'先驱公园入口',gx:720,gy:438,tp:'key'},{label:'阅读提示',gx:760,gy:439,tp:'key'},{label:'取市政厅钥匙',gx:828,gy:440,tp:'key'},{label:'开门处',gx:825,gy:433,tp:'key'},{label:'BOSS：Skinless Skulkers',gx:828,gy:440,tp:'boss'}]},
  q_forward:{t:'key',n:'天路',en:'A Way Forward',
    s:['在662°,455°铁路中心接任务','阅读671°,466°提示','搜索物美商场686°,409°文件柜','深谷754°,470°取火车动力装置','安装到660°,453°火车'],rw:'30000 XP（解锁北极快递）',
    locs:[{label:'接取任务（铁路中心）',gx:662,gy:455,tp:'start'},{label:'阅读提示',gx:671,gy:466,tp:'key'},{label:'物美商场（文件柜）',gx:686,gy:409,tp:'key'},{label:'取火车动力装置',gx:754,gy:470,tp:'key'},{label:'安装到火车（完成）',gx:660,gy:453,tp:'end'}]},
  q_polexp:{t:'key',n:'北极快递',en:'The Polaris Express',
    s:['完成天路后在659°,452°与火车互动','发明皮帽+冬季外套+热水瓶','三件冬装装备后再次与火车互动','在500°,198°点燃春天站台营火'],rw:'12000 XP（解锁西部地区）',
    locs:[{label:'接取任务（与火车互动）',gx:659,gy:452,tp:'start'},{label:'点燃营火（完成）',gx:500,gy:198,tp:'end'}]},
  q_foul:{t:'side',n:'严重犯规',en:'Foul Play',
    s:['在中枢626°,400°接取','装备棒球棒（LV.15）、棒球帽（LV.3）、棒球卡（LV.17）','80秒消灭12个敌人'],rw:'44000 XP',
    locs:[{label:'接取任务 / 战斗区域',gx:626,gy:400,tp:'start'}]},
  q_port:{t:'side',n:'港口',en:'Port Of Call',
    s:['在中枢警察总部577°,395°接取','前往西港链塔352°,444°','通过340°,446°管道到海军工厂','搜索281°,483°箱子→盾牌秘诀'],rw:'盾牌秘诀 + 41000 XP',
    locs:[{label:'接取任务（警察总部）',gx:577,gy:395,tp:'start'},{label:'西港链塔',gx:352,gy:444,tp:'key'},{label:'通过管道处',gx:340,gy:446,tp:'key'},{label:'盾牌秘诀（海军工厂）',gx:281,gy:483,tp:'end'}]},
  q_scavenger:{t:'side',n:'追捕清道夫',en:'Scavenger Hunt',
    s:['在冰霜969°,175°接取','①绿色咖啡机952°,195°（需撬锁/破墙）','②红色电视机945°,151°','③蓝色散热器929°,179°','④橙色墓碑921°,215°','⑤黄色祖父钟863°,101°','挖掘836°,110°宝藏'],rw:'20000 XP',
    locs:[{label:'接取任务',gx:969,gy:175,tp:'start'},{label:'①绿色咖啡机',gx:952,gy:195,tp:'key'},{label:'②红色电视机',gx:945,gy:151,tp:'key'},{label:'③蓝色散热器',gx:929,gy:179,tp:'key'},{label:'④橙色墓碑',gx:921,gy:215,tp:'key'},{label:'⑤黄色祖父钟',gx:863,gy:101,tp:'key'},{label:'挖掘宝藏（完成）',gx:836,gy:110,tp:'dig'}]},
  q_fangman:{t:'side',n:'村庄',en:'The Fangman Cometh',
    s:['在冰霜931°,152°接取','发明獠牙（LV.20，骨头×15、橡胶×20）','装备獠牙','65秒击败4波共11个敌人'],rw:'3000 XP',
    locs:[{label:'接取任务 / 战斗区域',gx:931,gy:152,tp:'start'}]},
  q_ark:{t:'key',n:'方舟',en:'The Ark',
    s:['在冰霜863°,251°接取（或进入方舟触发）','进入方舟，完成所有收集项目','进入方舟第二层','注：方舟实验室钥匙在王冠1036°,499°隧道'],rw:'50000 XP（解锁神力拳套工厂）',
    locs:[{label:'接取任务 / 方舟入口',gx:863,gy:251,tp:'start'},{label:'方舟实验室钥匙（王冠隧道）',gx:1036,gy:499,tp:'key'}]},
  q_smallkey:{t:'side',n:'小钥匙开大门',en:'A Small Key Opens Big Doors',
    s:['在北极星522°,188°接取','阅读527°,185°文件','前往公共建筑522°,231°（注意机枪）','前往防御小屋779°,235°','搜索779°,236°微波炉取北极星大门钥匙','去链塔566°,129°开启大门'],rw:'30000 XP',
    locs:[{label:'接取任务',gx:522,gy:188,tp:'start'},{label:'阅读文件',gx:527,gy:185,tp:'key'},{label:'公共建筑（阅读文件）',gx:522,gy:231,tp:'key'},{label:'防御小屋（取钥匙）',gx:779,gy:235,tp:'key'},{label:'链塔（开启大门）',gx:566,gy:129,tp:'end'}]},
  q_fab:{t:'side',n:'初级加工厂',en:'Fabricator Basics',
    s:['在北极星478°,118°接取','在480°,121°启动加工厂','制作老式怀表（铁×20、废金属×30、神力珠×20）'],rw:'10000 XP',
    locs:[{label:'接取任务',gx:478,gy:118,tp:'start'},{label:'加工厂（制作怀表）',gx:480,gy:121,tp:'end'}]},
  q_mansion:{t:'side',n:'宅邸',en:'Maniac Mansion',
    s:['在西港豪华别墅437°,354°接取','搜索四处书架集密码（0451）','在423°,380°密码锁开门（内有神力碎片）'],rw:'神力碎片×1 + 18800 XP',
    locs:[{label:'接取任务（豪华别墅）',gx:437,gy:354,tp:'start'},{label:'密码锁开门处',gx:423,gy:380,tp:'end'}]},
  q_coolhead:{t:'side',n:'头冷脚热',en:'Cool Head, Hot Feet',
    s:['在285°,623°接取','阅读270°,621°提示','前往外星农场524°,671°（破墙进入）','检查邮箱441°,634°','搜索面包车388°,651°→沙漠头盔秘诀'],rw:'沙漠头盔秘诀 + 6000 XP',
    locs:[{label:'接取任务',gx:285,gy:623,tp:'start'},{label:'阅读提示',gx:270,gy:621,tp:'key'},{label:'外星农场（破墙进入）',gx:524,gy:671,tp:'key'},{label:'检查邮箱',gx:441,gy:634,tp:'key'},{label:'搜索面包车（头盔秘诀）',gx:388,gy:651,tp:'end'}]},
  q_displaced:{t:'key',n:'取代',en:'Displaced',
    s:['在水银装置244°,821°接取','制作电子手腕表（钢×15、电子器件×5、神力珠×20）','装备手腕表进入发光裂隙','140秒内击败5波古墓守卫（传送各地）'],rw:'裂谷工具包秘诀 + 35000 XP',
    locs:[{label:'接取任务（水银装置）',gx:244,gy:821,tp:'start'},{label:'制造厂（制作手腕表）',gx:239,gy:815,tp:'key'},{label:'第2波传送点',gx:589,gy:613,tp:'key'},{label:'第3波传送点',gx:1372,gy:528,tp:'key'},{label:'第4波传送点',gx:749,gy:440,tp:'key'},{label:'第5波传送点',gx:1246,gy:790,tp:'end'}]},
  q_floodgates:{t:'side',n:'打开闸门',en:'Open The Floodgates',
    s:['在250°,239°附近触发任务','阅读278°,236°提示','峡湾村230°,160°水槽取控制室钥匙','控制室操作终端257°,244°降低水位'],rw:'26000 XP',
    locs:[{label:'任务触发区域',gx:250,gy:239,tp:'start'},{label:'阅读提示',gx:278,gy:236,tp:'key'},{label:'峡湾村（取钥匙）',gx:230,gy:160,tp:'key'},{label:'控制室（降水位）',gx:257,gy:244,tp:'end'}]},
  q_under:{t:'key',n:'地下出路',en:'Under and Out',mapId:'undercrown',
    s:['在地下城1032°,339°接取','操作终端1009°,346°解锁闸门','前往982°,351°电梯进入王冠'],rw:'20000 XP（解锁王冠）',
    locs:[{label:'接取任务',gx:1032,gy:339,tp:'start'},{label:'操作终端（解锁闸门）',gx:1009,gy:346,tp:'key'},{label:'电梯（进入王冠）',gx:982,gy:351,tp:'end'}]},
  q_kingslog:{t:'side',n:'国王的日志',en:"King's Log",
    s:['收听5处音频日志：902°,430° / 881°,466° / 878°,502° / 963°,477° / 1011°,480°'],rw:'10000 XP',
    locs:[{label:'音频日志①',gx:902,gy:430,tp:'start'},{label:'音频日志②',gx:881,gy:466,tp:'key'},{label:'音频日志③',gx:878,gy:502,tp:'key'},{label:'音频日志④',gx:963,gy:477,tp:'key'},{label:'音频日志⑤（需发射台钥匙）',gx:1011,gy:480,tp:'end'}]},
  q_leak:{t:'side',n:'山峰上的泄漏',en:'Leak at the Peak',
    s:['乘无人机到春峰营火1029°,428°','走复杂路线到废弃化工厂','取抽水工业门禁卡1146°,484°','终端开门1162°,499°','搜索烤鲶鱼菜谱1180°,490°'],rw:'烤鲶鱼菜谱 + 87500 XP',
    locs:[{label:'接取任务（春峰营火）',gx:1029,gy:428,tp:'start'},{label:'取门禁卡',gx:1146,gy:484,tp:'key'},{label:'终端开门',gx:1162,gy:499,tp:'key'},{label:'烤鲶鱼菜谱（完成）',gx:1180,gy:490,tp:'end'}]},
  q_volcanic:{t:'key',n:'火山踪迹',en:'Volcanic Trail',
    s:['点亮营火183°,573°','修复终端158°,529°（废弃电子×5、橡胶×5）','取钥匙140°,552°（需锤子/拳套破墙）','上山至火山口150°,449°'],rw:'33600 XP',
    locs:[{label:'接取任务（点亮营火）',gx:183,gy:573,tp:'start'},{label:'修复终端（开门）',gx:158,gy:529,tp:'key'},{label:'取火山通道钥匙（破墙进入）',gx:140,gy:552,tp:'key'},{label:'火山口（完成）',gx:150,gy:449,tp:'end'}]},
  q_stop_respawn:{t:'side',n:'阻止怪物重生',en:'Stop Monster Respawning',
    s:['发明链塔工具包（LV.7，铁×10、废弃电子×10）','在任意链塔安装死亡传送'],rw:'5000 XP',
    locs:[{label:'在任意链塔触发（如迦百农链塔）',gx:1372,gy:528,tp:'start'}]},
  q_sweltering:{t:'side',n:'热带避难',en:'Sweltering Heat',
    s:['进入任何热带地区触发','发明牛仔帽+冰块'],rw:'8000 XP',
    locs:[{label:'触发区域（夕阳沙漠）',gx:700,gy:650,tp:'start'}]},
  q_winter:{t:'side',n:'过冬准备',en:'Preparing For Winter',
    s:['进入任何寒带地区触发','发明皮帽+热水瓶'],rw:'8000 XP',
    locs:[{label:'触发区域（冰霜）',gx:969,gy:175,tp:'start'}]},
  q_mythtabs:{t:'key',n:'神秘石碑',en:'Myth Tablets',
    s:['找到并查明散落主岛各地的神秘石碑（共10块）','集齐后在大金字塔附近423°,380°神力裂隙传送至瓦肯镇'],rw:'50000 XP',
    locs:[{label:'神力裂隙传送点（集齐后）',gx:423,gy:380,tp:'end'}]},
  q_obelisks:{t:'side',n:'神秘的方尖碑',en:'Mysterious Obelisks',
    s:['检查散落主岛的3个不同方尖碑'],rw:'8000 XP',
    locs:[{label:'方尖碑（示例位置）',gx:900,gy:350,tp:'start'}]},
  q_shelter:{t:'side',n:'防御庇护所',en:'Shelter Defence',
    s:['激活任意扬声器引出怪物','建立防御工事并消灭怪物'],rw:'炮塔弹药扩展秘诀 + CPU×1 + 5000 XP',
    locs:[{label:'触发区域（任意避难所）',gx:800,gy:550,tp:'start'}]},
  q_strange:{t:'side',n:'奇异能量',en:'Strange Energy',
    s:['接近3个不同的？图标（神力裂隙）触发','去任意链塔扫描','前往索拉里斯星水银装置242°,821°'],rw:'7000 XP',
    locs:[{label:'接取后前往水银装置',gx:242,gy:821,tp:'end'}]},
  q_escape:{t:'main',n:'逃离岛屿',en:'Escape the Island',
    s:['完成最终坚守任务，击败所有BOSS','发明全套末日盔甲（王冠套装）','在中枢主基地915°,461°激活发射台','倒计时结束，离开岛屿'],rw:'主线结局（游戏通关）',
    locs:[{label:'发射台（结局触发）',gx:915,gy:461,tp:'end'}]},
};
// 地下城专属任务
QD.q_toxic={t:'key',n:'毒素摧毁者',en:'The Toxic Destroyer',mapId:'undercrown',
  s:['装备防毒面具（必须）进入地下城','在地下城933°,340°寻找毒素摧毁者BOSS','击败BOSS后获得通往深处的通道'],rw:'15000 XP',
  locs:[{label:'BOSS：毒素摧毁者',gx:933,gy:340,tp:'boss'}]};
QD.q_undercrown_explore={t:'side',n:'地下城探索',en:'Undercrown Exploration',mapId:'undercrown',
  s:['从王冠地区的地下通道入口进入地下城（890°,372° 或 1076°,372°）','找到电梯入口982°,352°返回地面','在旧矿洞窟（迷失洞窟）探索宝藏，坐标约954°-992°,426°-428°'],rw:'探索奖励 + 宝藏物资',
  locs:[{label:'西入口',gx:890,gy:372,tp:'start'},{label:'东入口',gx:1076,gy:372,tp:'key'},{label:'王冠站电梯',gx:982,gy:352,tp:'end'},{label:'迷失洞窟宝藏①',gx:954,gy:428,tp:'dig'},{label:'迷失洞窟宝藏②',gx:992,gy:426,tp:'dig'}]};

// ════════════════════════════════════════════════
// QUEST LOCATION MARKERS — temp layer
// ════════════════════════════════════════════════
let questMarkerLayer=null;
let activeQuestId=null;

// Colors per type
const LOC_COLORS={
  start:'#ff9800',   // 接取点 — 橙色
  key:'#4cc9f0',     // 关键地点 — 蓝色
  end:'#4ade80',     // 完成/奖励 — 绿色
  boss:'#ef4444',    // BOSS — 红色
  dig:'#fbbf24',     // 挖掘 — 黄色
};
const LOC_ICONS={
  start:'⭐',key:'📍',end:'✅',boss:'☠',dig:'⛏',
};
const LOC_LABELS={
  start:'接取点',key:'关键地点',end:'完成点',boss:'BOSS',dig:'挖掘点',
};

function clearQuestMarkers(){
  if(questMarkerLayer){map.removeLayer(questMarkerLayer);questMarkerLayer=null;}
  activeQuestId=null;
  // Reset all card styles
  document.querySelectorAll('.qcard.active-quest').forEach(c=>c.classList.remove('active-quest'));
  document.querySelectorAll('.qmap-btn.active').forEach(b=>{b.classList.remove('active');b.textContent='📍 显示位置';});
  document.getElementById('clearQuestBtn').classList.remove('visible');
}

function showQuestOnMap(qid){
  const q=QD[qid];
  if(!q||!q.locs||!q.locs.length)return;

  // If already showing this quest, hide it
  if(activeQuestId===qid){clearQuestMarkers();return;}
  clearQuestMarkers();
  activeQuestId=qid;

  questMarkerLayer=L.layerGroup().addTo(map);

  const pts=[];
  q.locs.forEach((loc,i)=>{
    const ll=g2l_curr(loc.gx,loc.gy);
    pts.push(ll);
    const color=LOC_COLORS[loc.tp]||'#aaa';
    const emoji=LOC_ICONS[loc.tp]||'📍';
    const num=q.locs.length>1?(i+1):'';

    // Marker icon — use real PNG with step number badge
    const iconMap={'start':'icon-campfire','key':'icon-quest','end':'icon-entryway','boss':'icon-boss','dig':'icon-buried-treasure','audio':'icon-audio-log','terminal':'icon-terminal','chest':'icon-chest'};
    const iconFile=iconMap[loc.tp]||'icon-unknown';
    const icon=L.divIcon({
      className:'',
      html:`<div style="position:relative;width:36px;height:36px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(8,9,11,0.85);border:2px solid ${color};box-shadow:0 0 8px ${color}66;"></div>
        <img src="${IBASE}${iconFile}.png" style="position:absolute;inset:4px;width:28px;height:28px;image-rendering:pixelated;filter:drop-shadow(0 0 2px ${color});"/>
        ${num?`<div style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:50%;background:${color};color:#000;font-size:10px;font-weight:700;font-family:Rajdhani,sans-serif;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.6);">${num}</div>`:''}
      </div>`,
      iconSize:[36,36],iconAnchor:[18,18],popupAnchor:[0,-22],
    });

    const mk=L.marker(ll,{icon,zIndexOffset:2000});
    // Tooltip
    mk.bindTooltip(
      `<div style="font-size:11px;font-weight:700;color:${color};">${emoji} ${LOC_LABELS[loc.tp]||''}</div>`+
      `<div style="font-size:12px;margin-top:2px;">${loc.label}</div>`+
      `<div style="font-family:'Share Tech Mono',monospace;font-size:10px;opacity:.7;margin-top:2px;">${loc.gx}°, ${loc.gy}°</div>`,
      {className:'quest-loc-tooltip',permanent:false,direction:'top',offset:[0,-18]}
    );
    // Popup
    mk.bindPopup(
      `<div class="pi">
        <div class="pt" style="color:${color};">${emoji} ${LOC_LABELS[loc.tp]||''} · ${q.n}</div>
        <div class="pn" style="color:${color};">${loc.label}</div>
        <div class="pc">${loc.gx}°, ${loc.gy}°</div>
      </div>`,{maxWidth:260,className:''}
    );
    mk.addTo(questMarkerLayer);
  });

  // Draw polyline connecting steps (dashed)
  if(pts.length>1){
    L.polyline(pts,{
      color:'rgba(76,201,240,0.5)',weight:2,
      dashArray:'6 5',
      interactive:false,
    }).addTo(questMarkerLayer);
  }

  // Fit map to show all markers (with some padding)
  if(pts.length===1){
    map.setView(pts[0],Math.max(map.getZoom(),3),{animate:true,duration:.5});
  } else {
    const bounds=L.latLngBounds(pts);
    map.fitBounds(bounds,{padding:[60,60],maxZoom:5,animate:true,duration:.5});
  }

  // Update UI
  document.getElementById('clearQuestBtn').classList.add('visible');
  document.getElementById('clearQuestLabel').textContent=`${q.n} · 显示中 (${q.locs.length}个位置)`;

  // Highlight card
  const card=document.getElementById('qcard_'+qid);
  if(card){
    card.classList.add('active-quest');
    card.querySelector('.qb').classList.add('open');
  }

  // Update btn text
  document.querySelectorAll(`[data-mapqid="${qid}"]`).forEach(b=>{
    b.classList.add('active');b.innerHTML='📍 隐藏位置';
  });
}

// Clear button
document.getElementById('clearQuestBtn').addEventListener('click',clearQuestMarkers);
// Click map to clear
map.on('click',()=>{if(activeQuestId)clearQuestMarkers();});

// ════════════════════════════════════════════════
// MAIN MARKER DATA
// ════════════════════════════════════════════════
const MD=[
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:189,gy:91,n:'冰霜号角',r:'冰霜号角',d:'链塔 · 冰霜号角'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:973,gy:98,n:'传奇钓点',r:'爱尔兰',d:'钓鱼点 · 传奇钓点'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:167,gy:115,n:'埋藏宝藏',r:'冰霜号角',d:'埋藏宝藏 · 掉落: [15 x 香料, 1 x 钛]'},
  {tp:'resource',ic:'icon-lock2',cl:'#fb923c',gx:471,gy:115,n:'专家撬锁工具',r:'北极星',d:'上锁的门专家撬锁工具'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:478,gy:118,n:'初级加工厂',r:'北极星',qid:'q_fab',qt:'side',d:'支线任务初级加工厂'},
  {tp:'resource',ic:'icon-fabricator',cl:'#4ade80',gx:481,gy:120,n:'配方: [老式怀表]',r:'北极星',d:'加工厂配方: [老式怀表]'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:518,gy:116,n:'吊桥',r:'北极星',d:'吊桥'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:513,gy:104,n:'优质钓点',r:'北极星',d:'钓鱼点 · 优质钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:834,gy:120,n:'优质钓点',r:'冰霜',d:'钓鱼点 · 优质钓点'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:836,gy:110,n:'需要任务: 追捕清道夫 [支线任务]',r:'冰霜',d:'埋藏宝藏 · 需要任务: 追捕清道夫 [支线任务]掉落: [15 x 钢, 15 x 木料, 8 x 兽皮, 8 x 橡胶]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:864,gy:107,n:'孤独木屋',r:'冰霜',d:'营火孤独木屋'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:894,gy:100,n:'传奇钓点',r:'冰霜',d:'钓鱼点 · 传奇钓点'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:923,gy:118,n:'限时箱子',r:'冰霜',d:'限时箱子 · 限时: 15 秒 奖励: [8 x 织物]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1000,gy:106,n:'优质钓点',r:'爱尔兰',d:'钓鱼点 · 优质钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:125,gy:135,n:'优质钓点',r:'冰霜号角',d:'钓鱼点 · 优质钓点'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:566,gy:129,n:'北极星',r:'北极星',d:'链塔 · 北极星'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:869,gy:127,n:'收件人: 避难所奖励',r:'冰霜',d:'埋藏宝藏 · 收件人: 避难所奖励'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:886,gy:129,n:'许愿井',r:'冰霜',d:'许愿井'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:978,gy:128,n:'收音机',r:'爱尔兰',d:'收音机'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:1017,gy:122,n:'收件人: 智力测试',r:'爱尔兰',d:'埋藏宝藏 · 收件人: 智力测试'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1045,gy:140,n:'限时箱子',r:'爱尔兰',d:'限时箱子 · 限时: 24 秒 奖励: [4 x 钢, 6 x 织物]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1218,gy:122,n:'传奇钓点',r:'北欧化工',d:'钓鱼点 · 传奇钓点'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1247,gy:138,n:'埋藏宝藏',r:'北欧化工',d:'埋藏宝藏 · 掉落: [6 x 织物]'},
  {tp:'resource',ic:'icon-fuel-cell',cl:'#a78bfa',gx:1404,gy:133,n:'The Law of 北欧化工 惩教设施',r:'北欧化工',d:'燃料电池The Law of 北欧化工 惩教设施'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1428,gy:123,n:'监狱后院',r:'北欧化工',d:'营火监狱后院'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1688,gy:136,n:'限时箱子',r:'大角星',d:'限时箱子 · 限时: 19 秒 奖励: [8 x 木料, 8 x 陶瓷]'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:1708,gy:139,n:'许愿井',r:'大角星',d:'许愿井'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1743,gy:138,n:'奇异钓点',r:'大角星',d:'钓鱼点 · 奇异钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:139,gy:148,n:'阿卡迪亚外围',r:'冰霜号角',d:'营火阿卡迪亚外围'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:173,gy:158,n:'永恒职责',r:'冰霜号角',d:'古墓 · 永恒职责'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:219,gy:150,n:'神力裂隙',r:'冰霜号角',d:'神力裂隙'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:226,gy:142,n:'北极研究基地',r:'冰霜号角',d:'营火北极研究基地'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:228,gy:152,n:'限时箱子',r:'冰霜号角',d:'限时箱子 · 限时: 34 秒 奖励: [20 x 钢, 50 x 神力珠]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:452,gy:142,n:'北极星装置营火',r:'北极星',d:'营火北极星装置营火'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:612,gy:154,n:'冰桥营火',r:'北极星',d:'营火冰桥营火'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:645,gy:146,n:'收件人: 走廊挑战',r:'北极星',d:'埋藏宝藏 · 收件人: 走廊挑战'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:678,gy:157,n:'狗屋',r:'北极星',d:'狗屋'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:713,gy:156,n:'优质钓点',r:'北极星',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:936,gy:152,n:'狗屋',r:'冰霜',d:'狗屋'},
  {tp:'resource',ic:'icon-myth-tablet',cl:'#f0abfc',gx:988,gy:146,n:'神秘石碑',r:'爱尔兰',d:'神秘石碑'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1064,gy:144,n:'埋藏宝藏',r:'爱尔兰',d:'埋藏宝藏 · 掉落: [8 x 橡胶, 5 x 陶瓷]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1307,gy:147,n:'限时箱子',r:'北欧化工',d:'限时箱子 · 限时: 20 秒 奖励: [8 x 铁]'},
  {tp:'resource',ic:'icon-myth-tablet',cl:'#f0abfc',gx:1365,gy:142,n:'神秘石碑',r:'北欧化工',d:'神秘石碑'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1419,gy:149,n:'惩教设施',r:'北欧化工',d:'营火惩教设施'},
  {tp:'resource',ic:'icon-lock',cl:'#94a3b8',gx:1426,gy:143,n:'北欧化工 惩教设施 Key',r:'北欧化工',d:'上锁的门北欧化工 惩教设施 Key'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1427,gy:155,n:'限时箱子',r:'北欧化工',d:'限时箱子 · 限时: 11 秒 奖励: [6 x 橡胶]'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1427,gy:144,n:'闯入监狱',r:'北欧化工',qid:'q_prison',qt:'key',d:'支线任务闯入监狱'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1431,gy:151,n:'收音机',r:'北欧化工',d:'收音机'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1548,gy:146,n:'传奇钓点',r:'大角星',d:'钓鱼点 · 传奇钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:205,gy:168,n:'优质钓点',r:'冰霜号角',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:225,gy:170,n:'狗屋',r:'冰霜号角',d:'狗屋'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:326,gy:176,n:'传奇钓点',r:'冰霜号角',d:'钓鱼点 · 传奇钓点'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:485,gy:177,n:'埋藏宝藏',r:'北极星',d:'埋藏宝藏 · 掉落: [1 x 神力珠]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:522,gy:172,n:'埋藏宝藏',r:'北极星',d:'埋藏宝藏 · 掉落: [1 x 神力珠, 4 x 神力珠]'},
  {tp:'resource',ic:'icon-lock2',cl:'#fb923c',gx:951,gy:175,n:'专家撬锁工具',r:'冰霜',d:'上锁的门专家撬锁工具'},
  {tp:'resource',ic:'icon-lock2',cl:'#fb923c',gx:950,gy:168,n:'专家撬锁工具',r:'冰霜',d:'上锁的门专家撬锁工具'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:969,gy:175,n:'追捕清道夫',r:'冰霜',qid:'q_scavenger',qt:'side',d:'支线任务追捕清道夫'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1077,gy:178,n:'所需材料: [8 x 稀有木材]',r:'爱尔兰',d:'可修复所需材料: [8 x 稀有木材]'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:1131,gy:180,n:'狗屋',r:'爱尔兰',d:'狗屋'},
  {tp:'resource',ic:'icon-hatch',cl:'#a78bfa',gx:1204,gy:170,n:'Shelter',r:'北欧化工',d:'Shelter'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1236,gy:164,n:'荒野小屋',r:'北欧化工',d:'营火荒野小屋'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:1718,gy:171,n:'首领狼',r:'大角星',d:'BOSS · 首领狼'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:1761,gy:170,n:'收件人: 金爪挑战',r:'大角星',d:'埋藏宝藏 · 收件人: 金爪挑战'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:264,gy:187,n:'吊桥',r:'冰霜号角',d:'吊桥'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:260,gy:194,n:'神力裂隙',r:'冰霜号角',d:'神力裂隙'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:463,gy:191,n:'埋藏宝藏',r:'北极星',d:'埋藏宝藏 · 掉落: [10 x 钢, 4 x 橡胶, 2 x 神力珠]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:500,gy:198,n:'泉源站营火',r:'北极星',d:'营火泉源站营火'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:522,gy:188,n:'小钥匙开大门',r:'北极星',qid:'q_smallkey',qt:'side',d:'支线任务小钥匙开大门'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:704,gy:183,n:'限时箱子',r:'北极星',d:'限时箱子 · 限时: 20 秒 奖励: [10 x 钢, 10 x 胡萝卜, 5 x 大米]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:824,gy:191,n:'埋藏宝藏',r:'冰霜',d:'埋藏宝藏 · 掉落: [10 x 兽皮]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:882,gy:190,n:'优质钓点',r:'冰霜',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:932,gy:182,n:'收音机',r:'冰霜',d:'收音机'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:972,gy:182,n:'圣杯外围',r:'冰霜',d:'营火圣杯外围'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1061,gy:192,n:'所需材料: [5 x 稀有木材]',r:'爱尔兰',d:'可修复所需材料: [5 x 稀有木材]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1068,gy:190,n:'限时箱子',r:'爱尔兰',d:'限时箱子 · 限时: 21 秒 奖励: [8 x 兽皮, 15 x 钢]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1133,gy:187,n:'爱尔兰农庄',r:'爱尔兰',d:'营火爱尔兰农庄'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1128,gy:181,n:'收音机',r:'爱尔兰',d:'收音机'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1145,gy:187,n:'普通钓点',r:'爱尔兰',d:'钓鱼点 · 普通钓点'},
  {tp:'resource',ic:'icon-shelter-loudspeaker',cl:'#86efac',gx:1213,gy:189,n:'Shelter 北欧化工 扬声器',r:'北欧化工',d:'避难所扬声器Shelter 北欧化工 扬声器'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1297,gy:184,n:'吊桥',r:'北欧化工',d:'吊桥'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1443,gy:193,n:'埋藏宝藏',r:'北欧化工',d:'埋藏宝藏 · 掉落: [15 x 陶瓷]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1505,gy:194,n:'限时箱子',r:'大角星',d:'限时箱子 · 限时: 13 秒 奖励: [7 x 铁, 4 x 织物]'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:1643,gy:181,n:'五道门将开',r:'大角星',d:'古墓 · 五道门将开'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:1671,gy:186,n:'狗屋',r:'大角星',d:'狗屋'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:125,gy:208,n:'普通钓点',r:'冰霜号角',d:'钓鱼点 · 普通钓点'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:171,gy:202,n:'限时箱子',r:'冰霜号角',d:'限时箱子 · 限时: 18 秒 奖励: [8 x 钢, 8 x 废弃电子, 8 x 电子器件]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:231,gy:209,n:'埋藏宝藏',r:'冰霜号角',d:'埋藏宝藏 · 掉落: [15 x 橡胶]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:373,gy:207,n:'优质钓点',r:'冰霜号角',d:'钓鱼点 · 优质钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:382,gy:207,n:'优质钓点',r:'冰霜号角',d:'钓鱼点 · 优质钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:450,gy:214,n:'优质钓点',r:'北极星',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:644,gy:218,n:'许愿井',r:'北极星',d:'许愿井'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:729,gy:218,n:'古墓',r:'北极星',d:'古墓'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:751,gy:206,n:'埋藏宝藏',r:'北极星',d:'埋藏宝藏 · 掉落: [6 x 橡胶, 2 x 塑料s]'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:835,gy:211,n:'海军基地 Inner 终端',r:'冰霜',d:'终端海军基地 Inner 终端'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:847,gy:213,n:'冰霜',r:'冰霜',d:'链塔 · 冰霜'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:860,gy:203,n:'海军基地终端',r:'冰霜',d:'终端海军基地终端'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:863,gy:202,n:'海军基地入口',r:'冰霜',d:'营火海军基地入口'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:977,gy:204,n:'普通钓点',r:'冰霜',d:'钓鱼点 · 普通钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:995,gy:213,n:'优质钓点',r:'爱尔兰',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1278,gy:213,n:'基础撬锁工具',r:'北欧化工',d:'上锁的门基础撬锁工具'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1278,gy:210,n:'基础撬锁工具',r:'北欧化工',d:'上锁的门基础撬锁工具'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:1274,gy:210,n:'狗屋',r:'北欧化工',d:'狗屋'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1283,gy:213,n:'收音机',r:'北欧化工',d:'收音机'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1377,gy:201,n:'东北发电站',r:'北欧化工',d:'营火东北发电站'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:1385,gy:201,n:'北欧化工',r:'北欧化工',d:'链塔 · 北欧化工'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1635,gy:218,n:'吊桥',r:'大角星',d:'吊桥'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:1666,gy:220,n:'大角星',r:'大角星',d:'链塔 · 大角星'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1664,gy:212,n:'海狸角',r:'大角星',d:'营火海狸角'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1674,gy:208,n:'基础撬锁工具',r:'大角星',d:'上锁的门基础撬锁工具'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1678,gy:210,n:'收音机',r:'大角星',d:'收音机'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:172,gy:223,n:'埋藏宝藏',r:'冰霜号角',d:'埋藏宝藏 · 掉落: [1 x 神力珠]'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:232,gy:237,n:'收音机',r:'冰霜号角',d:'收音机'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:238,gy:220,n:'优质钓点',r:'冰霜号角',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:279,gy:235,n:'收音机',r:'冰霜号角',d:'收音机'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:314,gy:232,n:'埋藏宝藏',r:'冰霜号角',d:'埋藏宝藏 · 掉落: [25 x 塑料s, 12 x 电子器件]'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:368,gy:236,n:'神力裂隙',r:'冰霜号角',d:'神力裂隙'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:413,gy:232,n:'传奇钓点',r:'冰霜号角',d:'钓鱼点 · 传奇钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:437,gy:240,n:'传奇钓点',r:'冰霜号角',d:'钓鱼点 · 传奇钓点'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:502,gy:222,n:'收音机',r:'北极星',d:'收音机'},
  {tp:'resource',ic:'icon-lock2',cl:'#fb923c',gx:522,gy:227,n:'专家撬锁工具',r:'北极星',d:'上锁的门专家撬锁工具'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:547,gy:222,n:'狗屋',r:'北极星',d:'狗屋'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:784,gy:227,n:'优质钓点',r:'北极星',d:'钓鱼点 · 优质钓点'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:813,gy:228,n:'限时箱子',r:'冰霜',d:'限时箱子 · 限时: 18 秒 奖励: [12 x 电子器件]'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:842,gy:236,n:'方舟 Gate 终端',r:'冰霜',d:'终端方舟 Gate 终端'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:850,gy:228,n:'收音机',r:'冰霜',d:'收音机'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:952,gy:221,n:'埋藏宝藏',r:'冰霜',d:'埋藏宝藏 · 掉落: [20 x 木料]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:986,gy:239,n:'优质钓点',r:'爱尔兰',d:'钓鱼点 · 优质钓点'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1044,gy:237,n:'初级锯木厂',r:'爱尔兰',qid:'q_sawmill',qt:'side',d:'支线任务初级锯木厂'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1061,gy:223,n:'天桥',r:'爱尔兰',qid:'q_bridge',qt:'side',d:'支线任务天桥'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1065,gy:221,n:'所需材料: [6 x 稀有木材]',r:'爱尔兰',d:'可修复所需材料: [6 x 稀有木材]'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:1097,gy:221,n:'爱尔兰',r:'爱尔兰',d:'链塔 · 爱尔兰'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1217,gy:223,n:'限时箱子',r:'北欧化工',d:'限时箱子 · 限时: 29 秒 奖励: [4 x 兽皮, 6 x 织物]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1273,gy:232,n:'优质钓点',r:'北欧化工',d:'钓鱼点 · 优质钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1305,gy:231,n:'小水獭',r:'北欧化工',d:'营火小水獭'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1722,gy:231,n:'埋藏宝藏',r:'大角星',d:'埋藏宝藏 · 掉落: [8 x 陶瓷]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1764,gy:237,n:'北欧旅行者小屋',r:'大角星',d:'营火北欧旅行者小屋'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:1764,gy:225,n:'狗屋',r:'大角星',d:'狗屋'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:228,gy:244,n:'水电大坝',r:'冰霜号角',d:'营火水电大坝'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:257,gy:244,n:'终端',r:'冰霜号角',d:'终端'},
  {tp:'resource',ic:'icon-lock',cl:'#94a3b8',gx:257,gy:240,n:'水电大坝 Control Room Key',r:'冰霜号角',d:'上锁的门水电大坝 Control Room Key'},
  {tp:'resource',ic:'icon-fuel-cell',cl:'#a78bfa',gx:282,gy:258,n:'The Sword in the Lake',r:'冰霜号角',d:'燃料电池The Sword in the Lake'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:375,gy:247,n:'下部泵站',r:'冰霜号角',d:'营火下部泵站'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:423,gy:242,n:'To: Sardine Sprint',r:'冰霜号角',d:'埋藏宝藏To: Sardine Sprint'},
  {tp:'resource',ic:'icon-hatch',cl:'#a78bfa',gx:507,gy:251,n:'Shelter',r:'北极星',d:'Shelter'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:662,gy:245,n:'埋藏宝藏',r:'北极星',d:'埋藏宝藏 · 掉落: [3 x 橡胶, 2 x 钢]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:694,gy:260,n:'北极星荒野营火',r:'北极星',d:'营火北极星荒野营火'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:786,gy:258,n:'吊桥',r:'冰霜',d:'吊桥'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:813,gy:241,n:'海军基地 Southern 终端',r:'冰霜',d:'终端海军基地 Southern 终端'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:867,gy:251,n:'方舟入口',r:'冰霜',d:'营火方舟入口'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:863,gy:251,n:'方舟',r:'冰霜',qid:'q_ark',qt:'key',d:'支线任务方舟'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:863,gy:255,n:'Ark',r:'冰霜',d:'入口通道Ark'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:931,gy:252,n:'村庄',r:'冰霜',qid:'q_fangman',qt:'side',d:'主线任务村庄'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:944,gy:242,n:'坏消息湾',r:'冰霜',d:'营火坏消息湾'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:956,gy:241,n:'优质钓点',r:'冰霜',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:949,gy:250,n:'收音机',r:'冰霜',d:'收音机'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1047,gy:243,n:'克雷布斯木材厂',r:'爱尔兰',d:'营火克雷布斯木材厂'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1085,gy:253,n:'埋藏宝藏',r:'爱尔兰',d:'埋藏宝藏 · 掉落: [5 x 兽皮, 8 x 塑料s]'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:1128,gy:255,n:'时机之墓',r:'爱尔兰',d:'古墓 · 时机之墓'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1152,gy:249,n:'优质钓点',r:'柴火',d:'钓鱼点 · 优质钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1210,gy:254,n:'优质钓点',r:'北欧化工',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:1232,gy:258,n:'To: Samoyed Test Park',r:'北欧化工',d:'埋藏宝藏To: Samoyed Test Park'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1298,gy:255,n:'猎狼',r:'北欧化工',qid:'q_wolves',qt:'side',d:'主线任务猎狼'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1314,gy:251,n:'埋藏宝藏',r:'北欧化工',d:'埋藏宝藏 · 掉落: [4 x 兽皮]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1321,gy:244,n:'优质钓点',r:'北欧化工',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:1405,gy:251,n:'许愿井',r:'北欧化工',d:'许愿井'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1518,gy:240,n:'北部检查站',r:'大角星',d:'营火北部检查站'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1518,gy:247,n:'收音机',r:'大角星',d:'收音机'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1773,gy:243,n:'优质钓点',r:'大角星',d:'钓鱼点 · 优质钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:197,gy:277,n:'幸存者岛附近',r:'冰霜号角',d:'营火幸存者岛附近'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:232,gy:278,n:'神力裂隙',r:'冰霜号角',d:'神力裂隙'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:246,gy:267,n:'吊桥',r:'冰霜号角',d:'吊桥'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:347,gy:264,n:'神力裂隙',r:'冰霜号角',d:'神力裂隙'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:367,gy:274,n:'神力裂隙',r:'冰霜号角',d:'神力裂隙'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:395,gy:273,n:'神力裂隙',r:'冰霜号角',d:'神力裂隙'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:405,gy:266,n:'埋藏宝藏',r:'冰霜号角',d:'埋藏宝藏 · 掉落: [30 x 塑料s, 8 x Superior Salmon]'},
  {tp:'resource',ic:'icon-shelter-loudspeaker',cl:'#86efac',gx:503,gy:275,n:'Shelter 北极星 扬声器',r:'北极星',d:'避难所扬声器Shelter 北极星 扬声器'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:637,gy:274,n:'Toxic Spot',r:'北极星',d:'钓鱼点Toxic Spot'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:822,gy:275,n:'优质钓点',r:'冰霜',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:914,gy:274,n:'所需材料: [6 x 稀有木材]',r:'冰霜',d:'可修复所需材料: [6 x 稀有木材]'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:956,gy:268,n:'狗屋',r:'冰霜',d:'狗屋'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1002,gy:275,n:'所需材料: [6 x 稀有木材]',r:'爱尔兰',d:'可修复所需材料: [6 x 稀有木材]'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1155,gy:261,n:'收音机',r:'柴火',d:'收音机'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1498,gy:262,n:'限时箱子',r:'大角星',d:'限时箱子 · 限时: 17 秒 奖励: [4 x 橡胶, 5 x 废弃电子]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1511,gy:271,n:'普通钓点',r:'大角星',d:'钓鱼点 · 普通钓点'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1610,gy:271,n:'北境人气',r:'大角星',qid:'q_northern',qt:'side',d:'主线任务北境人气'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:191,gy:294,n:'所需材料: [10 x 稀有木材]',r:'冰霜号角',d:'可修复所需材料: [10 x 稀有木材]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:394,gy:296,n:'埋藏宝藏',r:'西港',d:'埋藏宝藏 · 掉落: [4 x 钢, 2 x 稀有木材]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:411,gy:281,n:'限时箱子',r:'西港',d:'限时箱子 · 限时: 12 秒 奖励: [6 x 电子器件, 8 x 橡胶, 26 x 塑料s]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:549,gy:297,n:'北极星检查站营火',r:'北极星',d:'营火北极星检查站营火'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:550,gy:288,n:'北极星 Checkpoint 终端',r:'北极星',d:'终端北极星 Checkpoint 终端'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:881,gy:294,n:'埋藏宝藏',r:'冰霜',d:'埋藏宝藏 · 掉落: [8 x 钢, 20 x 木料, 5 x 橡胶]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:928,gy:289,n:'传奇钓点',r:'冰霜',d:'钓鱼点 · 传奇钓点'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:984,gy:282,n:'限时箱子',r:'爱尔兰',d:'限时箱子 · 限时: 23 秒 奖励: [3 x 电子器件, 5 x 废弃电子]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1009,gy:290,n:'需要任务: 无尽垃圾 [支线任务]',r:'爱尔兰',d:'埋藏宝藏 · 需要任务: 无尽垃圾 [支线任务]Key 掉落: [Continental Diner Key]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1004,gy:282,n:'限时箱子',r:'爱尔兰',d:'限时箱子 · 限时: 24 秒 奖励: [2 x 神力珠]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1277,gy:290,n:'埋藏宝藏',r:'北欧化工',d:'埋藏宝藏 · 掉落: [6 x 橡胶]'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:1325,gy:287,n:'北欧化工 Gate 终端',r:'北欧化工',d:'终端北欧化工 Gate 终端'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1324,gy:282,n:'基础撬锁工具',r:'北欧化工',d:'上锁的门基础撬锁工具'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:1428,gy:294,n:'避免回归',r:'北欧化工',d:'古墓 · 避免回归'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1568,gy:287,n:'埋藏宝藏',r:'大角星',d:'埋藏宝藏 · 掉落: [7 x 铁]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1640,gy:287,n:'限时箱子',r:'大角星',d:'限时箱子 · 限时: 30 秒 奖励: [12 x 织物]'},
  {tp:'resource',ic:'icon-hatch',cl:'#a78bfa',gx:1736,gy:286,n:'Shelter',r:'大角星',d:'Shelter'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1752,gy:295,n:'优质钓点',r:'大角星',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-shelter-loudspeaker',cl:'#86efac',gx:1757,gy:283,n:'Shelter 大角星 扬声器',r:'大角星',d:'避难所扬声器Shelter 大角星 扬声器'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:691,gy:318,n:'吊桥',r:'北极星',d:'吊桥'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:702,gy:317,n:'优质钓点',r:'北极星',d:'钓鱼点 · 优质钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:829,gy:309,n:'冰霜南部路边旅馆',r:'冰霜',d:'营火冰霜南部路边旅馆'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:903,gy:313,n:'古墓',r:'冰霜',d:'古墓'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:926,gy:311,n:'有毒收容设施A外围',r:'冰霜',d:'营火有毒收容设施A外围'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1028,gy:319,n:'原型反应堆外围',r:'爱尔兰',d:'营火原型反应堆外围'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1065,gy:315,n:'埋藏宝藏',r:'爱尔兰',d:'埋藏宝藏 · 掉落: [5 x 神力珠, 5 x 电子器件]'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1238,gy:301,n:'吊桥',r:'柴火',d:'吊桥'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:1282,gy:312,n:'许愿井',r:'北欧化工',d:'许愿井'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1373,gy:315,n:'收音机',r:'柴火',d:'收音机'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:1372,gy:310,n:'狗屋',r:'柴火',d:'狗屋'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1381,gy:307,n:'埃塞尔里奇遗址',r:'柴火',d:'营火埃塞尔里奇遗址'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:1554,gy:316,n:'狗屋',r:'柴火',d:'狗屋'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1559,gy:317,n:'基础撬锁工具',r:'柴火',d:'上锁的门基础撬锁工具'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:190,gy:321,n:'普通钓点',r:'冰霜号角',d:'钓鱼点 · 普通钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:197,gy:321,n:'优质钓点',r:'冰霜号角',d:'钓鱼点 · 优质钓点'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:268,gy:337,n:'抵御风暴',r:'冰霜号角',d:'古墓 · 抵御风暴'},
  {tp:'resource',ic:'icon-myth-tablet',cl:'#f0abfc',gx:313,gy:323,n:'神秘石碑',r:'冰霜号角',d:'神秘石碑'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:344,gy:332,n:'优质钓点',r:'西港',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:476,gy:332,n:'西港 North 终端',r:'西港',d:'终端西港 North 终端'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:538,gy:327,n:'埋藏宝藏',r:'中枢',d:'埋藏宝藏 · 掉落: [10 x 橡胶, 5 x 电子器件, 20 x 陶瓷]'},
  {tp:'resource',ic:'icon-shelter-loudspeaker',cl:'#86efac',gx:789,gy:334,n:'Shelter 冰霜 扬声器',r:'冰霜',d:'避难所扬声器Shelter 冰霜 扬声器'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:1031,gy:333,n:'Prototype Reactor 终端',r:'爱尔兰',d:'终端Prototype Reactor 终端'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1043,gy:324,n:'吊桥',r:'爱尔兰',d:'吊桥'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1120,gy:331,n:'普通钓点',r:'爱尔兰',d:'钓鱼点 · 普通钓点'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1164,gy:334,n:'限时箱子',r:'柴火',d:'限时箱子 · 限时: 12 秒 奖励: [15 x 陶瓷]'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:1197,gy:333,n:'Weight of the Four',r:'柴火',d:'古墓Weight of the Four'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1337,gy:338,n:'优质钓点',r:'柴火',d:'钓鱼点 · 优质钓点'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1418,gy:322,n:'限时箱子',r:'柴火',d:'限时箱子 · 限时: 11 秒 奖励: [3 x 兽皮, 4 x 铁]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1454,gy:326,n:'普通钓点',r:'柴火',d:'钓鱼点 · 普通钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1533,gy:325,n:'柯蒂斯菲尔德北部',r:'柴火',d:'营火柯蒂斯菲尔德北部'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1559,gy:324,n:'基础撬锁工具',r:'柴火',d:'上锁的门基础撬锁工具'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1664,gy:324,n:'优质钓点',r:'大角星',d:'钓鱼点 · 优质钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:258,gy:358,n:'奇异钓点',r:'西港',d:'钓鱼点 · 奇异钓点'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:334,gy:342,n:'吊桥',r:'西港',d:'吊桥'},
  {tp:'resource',ic:'icon-arena-obelisk',cl:'#f0abfc',gx:349,gy:354,n:'Wave 1 奖励: [12 x 钢]',r:'西港',d:'竞技场方尖碑Wave 1 奖励: [12 x 钢]Wave 2 奖励: [16 x 橡胶]Wave 3 奖励: [3 x 稀有木材]Wave 4 奖励: [3 x 钛]Wave 5 奖励: [2 x 神力珠]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:431,gy:356,n:'原木豪宅',r:'西港',d:'营火原木豪宅'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:437,gy:354,n:'宅邸',r:'西港',qid:'q_mansion',qt:'side',d:'支线任务宅邸'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:450,gy:352,n:'神力裂隙',r:'西港',d:'神力裂隙'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:721,gy:347,n:'免下车影院',r:'中枢',d:'营火免下车影院'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:770,gy:345,n:'埋藏宝藏',r:'冰霜',d:'埋藏宝藏 · 掉落: [10 x 橡胶]'},
  {tp:'resource',ic:'icon-hatch',cl:'#a78bfa',gx:794,gy:354,n:'Shelter',r:'冰霜',d:'Shelter'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:924,gy:347,n:'埋藏宝藏',r:'冰霜',d:'埋藏宝藏 · 掉落: [12 x 电子器件]'},
  {tp:'resource',ic:'icon-arena-obelisk',cl:'#f0abfc',gx:1091,gy:355,n:'Wave 1 奖励: [14 x 木料]',r:'爱尔兰',d:'竞技场方尖碑Wave 1 奖励: [14 x 木料]Wave 2 奖励: [14 x 铁]Wave 3 奖励: [10 x 橡胶]Wave 4 奖励: [8 x 电子器件]Wave 5 奖励: [3 x 钢]'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1121,gy:351,n:'无尽垃圾',r:'爱尔兰',qid:'q_trash',qt:'side',d:'支线任务无尽垃圾'},
  {tp:'resource',ic:'icon-lock',cl:'#94a3b8',gx:1125,gy:354,n:'Continental Diner Key',r:'爱尔兰',d:'上锁的门Continental Diner Key'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1271,gy:350,n:'优质钓点',r:'柴火',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-lock2',cl:'#fb923c',gx:1516,gy:356,n:'专家撬锁工具',r:'柴火',d:'上锁的门专家撬锁工具'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1524,gy:351,n:'收音机',r:'柴火',d:'收音机'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1542,gy:343,n:'基础撬锁工具',r:'柴火',d:'上锁的门基础撬锁工具'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:314,gy:364,n:'传奇钓点',r:'西港',d:'钓鱼点 · 传奇钓点'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:390,gy:375,n:'埋藏宝藏',r:'西港',d:'埋藏宝藏 · 掉落: [40 x 塑料s, 1 x 钛]'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:419,gy:361,n:'狗屋',r:'西港',d:'狗屋'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:581,gy:363,n:'狗屋',r:'中枢',d:'狗屋'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:583,gy:377,n:'收音机',r:'中枢',d:'收音机'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:619,gy:374,n:'足球场外围',r:'中枢',d:'营火足球场外围'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:709,gy:365,n:'狗屋',r:'中枢',d:'狗屋'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:759,gy:379,n:'山坡郊区',r:'中枢',d:'营火山坡郊区'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:876,gy:364,n:'收音机',r:'冰霜',d:'收音机'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:873,gy:372,n:'Entrance Undercrown West',r:'冰霜',d:'入口通道Entrance Undercrown West'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:965,gy:367,n:'王冠 Station Elevator',r:'王冠',d:'入口通道王冠 Station Elevator'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1058,gy:376,n:'埋藏宝藏',r:'爱尔兰',d:'埋藏宝藏 · 掉落: [1 x 神力珠, 1 x Mana Chunk]'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:1097,gy:372,n:'Entrance Undercrown East',r:'爱尔兰',d:'入口通道Entrance Undercrown East'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:1172,gy:369,n:'Wall Checkpoint Kappa 终端',r:'柴火',d:'终端Wall Checkpoint Kappa 终端'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1175,gy:369,n:'破碎的北航站楼',r:'柴火',qid:'q_terminal_n',qt:'key',d:'支线任务破碎的北航站楼'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1228,gy:373,n:'收音机',r:'柴火',d:'收音机'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1230,gy:366,n:'基础撬锁工具',r:'柴火',d:'上锁的门基础撬锁工具'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1237,gy:363,n:'基础撬锁工具',r:'柴火',d:'上锁的门基础撬锁工具'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:1247,gy:376,n:'狗屋',r:'柴火',d:'狗屋'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1299,gy:377,n:'钓鱼',r:'柴火',qid:'q_fishing',qt:'side',d:'支线任务钓鱼'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1291,gy:375,n:'普通钓点',r:'柴火',d:'钓鱼点 · 普通钓点'},
  {tp:'resource',ic:'icon-link-relay',cl:'#fb923c',gx:1303,gy:365,n:'链接中继站',r:'柴火',d:'链接中继站'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1301,gy:372,n:'双湖',r:'柴火',d:'营火双湖'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1337,gy:376,n:'埋藏宝藏',r:'柴火',d:'埋藏宝藏 · 掉落: [3 x 废弃电子]'},
  {tp:'resource',ic:'icon-arena-obelisk',cl:'#f0abfc',gx:1367,gy:375,n:'Wave 1 奖励: [15 x 塑料s]',r:'柴火',d:'竞技场方尖碑Wave 1 奖励: [15 x 塑料s]Wave 2 奖励: [10 x 陶瓷]Wave 3 奖励: [8 x 织物]Wave 4 奖励: [8 x 铁]Wave 5 奖励: [5 x 废弃电子]'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:1451,gy:368,n:'狗屋',r:'柴火',d:'狗屋'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1486,gy:369,n:'收音机',r:'柴火',d:'收音机'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:1496,gy:375,n:'凶猛斗士',r:'柴火',d:'BOSS · 凶猛斗士'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:1495,gy:378,n:'凶猛斗士',r:'柴火',d:'BOSS · 凶猛斗士'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1515,gy:363,n:'限时箱子',r:'柴火',d:'限时箱子 · 限时: 17 秒 奖励: [8 x 钢]'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1543,gy:366,n:'基础撬锁工具',r:'柴火',d:'上锁的门基础撬锁工具'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:356,gy:393,n:'埋藏宝藏',r:'西港',d:'埋藏宝藏 · 掉落: [18 x 橡胶, 6 x 陶瓷]'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:522,gy:380,n:'To: Companion 挑战',r:'西港',d:'埋藏宝藏To: Companion 挑战'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:577,gy:395,n:'港口',r:'中枢',qid:'q_port',qt:'side',d:'支线任务港口'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:626,gy:400,n:'严重犯规',r:'中枢',qid:'q_foul',qt:'side',d:'主线任务严重犯规'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:674,gy:381,n:'限时箱子',r:'中枢',d:'限时箱子 · 限时: 8 秒 奖励: [12 x 橡胶]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:666,gy:396,n:'埋藏宝藏',r:'中枢',d:'埋藏宝藏 · 掉落: [3 x 骨头, 12 x 铁, 6 x 电子器件]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:737,gy:391,n:'埋藏宝藏',r:'中枢',d:'埋藏宝藏 · 掉落: [15 x 陶瓷, 8 x 废弃电子]'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:796,gy:382,n:'狗屋',r:'中枢',d:'狗屋'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:804,gy:384,n:'狗屋',r:'中枢',d:'狗屋'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:821,gy:393,n:'中枢东部城市郊区',r:'中枢',d:'营火中枢东部城市郊区'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:932,gy:391,n:'To: Rampage Ring',r:'王冠',d:'埋藏宝藏To: Rampage Ring'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:987,gy:389,n:'王冠站入口',r:'王冠',d:'营火王冠站入口'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1013,gy:399,n:'埋藏宝藏',r:'王冠',d:'埋藏宝藏 · 掉落: [2 x 钛]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1136,gy:383,n:'爱尔兰休息站',r:'爱尔兰',d:'营火爱尔兰休息站'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1221,gy:389,n:'收音机',r:'柴火',d:'收音机'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1245,gy:395,n:'路边储存场',r:'柴火',d:'营火路边储存场'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1448,gy:392,n:'基础撬锁工具',r:'柴火',d:'上锁的门基础撬锁工具'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1463,gy:391,n:'阿曼多二手车行',r:'柴火',d:'营火阿曼多二手车行'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1553,gy:399,n:'埋藏宝藏',r:'柴火',d:'埋藏宝藏 · 掉落: [5 x 废弃电子]'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1542,gy:398,n:'吊桥',r:'柴火',d:'吊桥'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1612,gy:386,n:'吊桥',r:'卡纳维拉尔',d:'吊桥'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:165,gy:411,n:'传奇钓点',r:'瓦肯镇',d:'钓鱼点 · 传奇钓点'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:183,gy:418,n:'限时箱子',r:'瓦肯镇',d:'限时箱子 · 限时: 21 秒 奖励: [2 x 钛, 2 x 稀有木材, 6 x 电子器件]'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:410,gy:414,n:'神力裂隙',r:'西港',d:'神力裂隙'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:492,gy:408,n:'西港悬崖古墓',r:'西港',d:'营火西港悬崖古墓'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:503,gy:408,n:'交替密码',r:'西港',d:'古墓 · 交替密码'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:678,gy:415,n:'商场装卸区',r:'中枢',d:'营火商场装卸区'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:691,gy:406,n:'收音机',r:'中枢',d:'收音机'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:805,gy:407,n:'收音机',r:'中枢',d:'收音机'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:826,gy:415,n:'City Hall Gate',r:'中枢',d:'终端City Hall Gate'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:894,gy:415,n:'王冠',r:'王冠',d:'链塔 · 王冠'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:908,gy:409,n:'神力裂隙',r:'王冠',d:'神力裂隙'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:933,gy:404,n:'埋藏宝藏',r:'王冠',d:'埋藏宝藏 · 掉落: [5 x 钛]'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:942,gy:400,n:'神力裂隙',r:'王冠',d:'神力裂隙'},
  {tp:'resource',ic:'icon-lock',cl:'#94a3b8',gx:1247,gy:401,n:'Wayward Storage Key',r:'柴火',d:'上锁的门Wayward Storage Key'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1252,gy:400,n:'运输',r:'柴火',qid:'q_shipment',qt:'side',d:'支线任务运输'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1374,gy:416,n:'基础撬锁工具',r:'柴火',d:'上锁的门基础撬锁工具'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1378,gy:412,n:'基础撬锁工具',r:'柴火',d:'上锁的门基础撬锁工具'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1385,gy:410,n:'大宅',r:'柴火',d:'营火大宅'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1380,gy:408,n:'收音机',r:'柴火',d:'收音机'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1409,gy:408,n:'收音机',r:'柴火',d:'收音机'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:1422,gy:408,n:'柴火',r:'柴火',d:'链塔 · 柴火'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1560,gy:419,n:'优质钓点',r:'柴火',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:166,gy:440,n:'所需材料: [4 x 稀有木材]',r:'瓦肯镇',d:'可修复所需材料: [4 x 稀有木材]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:171,gy:429,n:'埋藏宝藏',r:'瓦肯镇',d:'埋藏宝藏 · 掉落: [12 x 电子器件, 20 x 钢]'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:166,gy:420,n:'To: Showtime Arena',r:'瓦肯镇',d:'埋藏宝藏To: Showtime Arena'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:290,gy:429,n:'优质钓点',r:'西港',d:'钓鱼点 · 优质钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:348,gy:432,n:'西港港口',r:'西港',d:'营火西港港口'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:378,gy:428,n:'收音机',r:'西港',d:'收音机'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:439,gy:438,n:'收音机',r:'西港',d:'收音机'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:443,gy:435,n:'狗屋',r:'西港',d:'狗屋'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:463,gy:422,n:'埋藏宝藏',r:'西港',d:'埋藏宝藏 · 掉落: [4 x 稀有木材]'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:573,gy:424,n:'收音机',r:'中枢',d:'收音机'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:564,gy:431,n:'限时箱子',r:'中枢',d:'限时箱子 · 限时: 13 秒 奖励: [10 x 钢, 10 x 橡胶]'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:665,gy:433,n:'中枢',r:'中枢',d:'链塔 · 中枢'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:766,gy:439,n:'先驱公园',r:'中枢',d:'营火先驱公园'},
  {tp:'resource',ic:'icon-lock',cl:'#94a3b8',gx:805,gy:437,n:'中枢 City Hall Key',r:'中枢',d:'上锁的门中枢 City Hall Key'},
  {tp:'resource',ic:'icon-lock',cl:'#94a3b8',gx:812,gy:437,n:'中枢 City Hall Key',r:'中枢',d:'上锁的门中枢 City Hall Key'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:805,gy:432,n:'收音机',r:'中枢',d:'收音机'},
  {tp:'resource',ic:'icon-lock',cl:'#94a3b8',gx:821,gy:434,n:'中枢 City Hall Key',r:'中枢',d:'上锁的门中枢 City Hall Key'},
  {tp:'resource',ic:'icon-lock',cl:'#94a3b8',gx:825,gy:433,n:'中枢 City Hall Key',r:'中枢',d:'上锁的门中枢 City Hall Key'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:899,gy:439,n:'狗屋',r:'王冠',d:'狗屋'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:908,gy:427,n:'收音机',r:'王冠',d:'收音机'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:902,gy:430,n:'王冠 K23',r:'王冠',d:'音频日志王冠 K23'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:953,gy:429,n:'神力裂隙',r:'王冠',d:'神力裂隙'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:975,gy:433,n:'王冠站中心',r:'王冠',d:'营火王冠站中心'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1029,gy:428,n:'春峰旁着陆板',r:'王冠',d:'营火春峰旁着陆板'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1133,gy:433,n:'传奇钓点',r:'爱尔兰',d:'钓鱼点 · 传奇钓点'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1143,gy:424,n:'收音机',r:'爱尔兰',d:'收音机'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:1188,gy:420,n:'收件人: 被遗忘的盗贼',r:'柴火',d:'埋藏宝藏 · 收件人: 被遗忘的盗贼'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1325,gy:432,n:'埋藏宝藏',r:'柴火',d:'埋藏宝藏 · 掉落: [3 x 兽皮]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1486,gy:420,n:'埋藏宝藏',r:'卡纳维拉尔',d:'埋藏宝藏 · 掉落: [4 x 铁]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1518,gy:427,n:'限时箱子',r:'卡纳维拉尔',d:'限时箱子 · 限时: 15 秒 奖励: [5 x 铁, 3 x 陶瓷]'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1596,gy:428,n:'吊桥',r:'卡纳维拉尔',d:'吊桥'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:159,gy:453,n:'破火山口',r:'瓦肯镇',d:'营火破火山口'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:206,gy:442,n:'优质钓点',r:'瓦肯镇',d:'钓鱼点 · 优质钓点'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:352,gy:444,n:'西港',r:'西港',d:'链塔 · 西港'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:366,gy:445,n:'收音机',r:'西港',d:'收音机'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:451,gy:446,n:'劳伦斯农场',r:'西港',d:'营火劳伦斯农场'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:534,gy:456,n:'许愿井',r:'西港',d:'许愿井'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:569,gy:447,n:'收音机',r:'中枢',d:'收音机'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:627,gy:459,n:'优质钓点',r:'中枢',d:'钓鱼点 · 优质钓点'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:662,gy:455,n:'天路',r:'中枢',qid:'q_forward',qt:'key',d:'支线任务天路'},
  {tp:'resource',ic:'icon-lock',cl:'#94a3b8',gx:802,gy:447,n:'中枢 City Hall Key',r:'中枢',d:'上锁的门中枢 City Hall Key'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:801,gy:452,n:'埋藏宝藏',r:'中枢',d:'埋藏宝藏 · 掉落: [4 x 钢, 4 x 橡胶, 4 x 电子器件]'},
  {tp:'resource',ic:'icon-lock',cl:'#94a3b8',gx:827,gy:444,n:'中枢 City Hall Key',r:'中枢',d:'上锁的门中枢 City Hall Key'},
  {tp:'resource',ic:'icon-lock',cl:'#94a3b8',gx:831,gy:443,n:'中枢 City Hall Key',r:'中枢',d:'上锁的门中枢 City Hall Key'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:852,gy:444,n:'剥皮潜伏者',r:'中枢',d:'BOSS · 剥皮潜伏者'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:845,gy:443,n:'剥皮潜伏者',r:'中枢',d:'BOSS · 剥皮潜伏者'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:912,gy:455,n:'交叉光的启示',r:'王冠',d:'古墓 · 交叉光的启示'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:904,gy:454,n:'限时箱子',r:'王冠',d:'限时箱子 · 限时: 12 秒 奖励: [1 x 蓝眼球宝珠]'},
  {tp:'resource',ic:'icon-lock',cl:'#94a3b8',gx:990,gy:459,n:'Launchpad Key',r:'王冠',d:'上锁的门Launchpad Key'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1027,gy:453,n:'埋藏宝藏',r:'王冠',d:'埋藏宝藏 · 掉落: [5 x 神力珠, 2 x 钛]'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:1160,gy:454,n:'神力裂隙',r:'王冠',d:'神力裂隙'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1208,gy:451,n:'埋藏宝藏',r:'柴火',d:'埋藏宝藏 · 掉落: [5 x 织物]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1367,gy:453,n:'限时箱子',r:'柴火',d:'限时箱子 · 限时: 12 秒 奖励: [6 x Scrap 金属]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1414,gy:451,n:'孤独农场',r:'柴火',d:'营火孤独农场'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1431,gy:451,n:'干草机',r:'柴火',qid:'q_haymaker',qt:'side',d:'主线任务干草机'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:1425,gy:456,n:'许愿井',r:'柴火',d:'许愿井'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1547,gy:456,n:'普通钓点',r:'卡纳维拉尔',d:'钓鱼点 · 普通钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1600,gy:455,n:'白纸般的心灵',r:'卡纳维拉尔',d:'营火白纸般的心灵'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1605,gy:457,n:'建筑工程',r:'卡纳维拉尔',qid:'q_building',qt:'key',d:'支线任务建筑工程'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:93,gy:472,n:'优质钓点',r:'瓦肯镇',d:'钓鱼点 · 优质钓点'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:89,gy:461,n:'埋藏宝藏',r:'瓦肯镇',d:'埋藏宝藏 · 掉落: [20 x 陶瓷, 24 x 木料]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:105,gy:473,n:'天涯海角',r:'瓦肯镇',d:'营火天涯海角'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:105,gy:476,n:'狗屋',r:'瓦肯镇',d:'狗屋'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:154,gy:470,n:'变化的迷宫',r:'瓦肯镇',d:'古墓 · 变化的迷宫'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:206,gy:476,n:'收音机',r:'瓦肯镇',d:'收音机'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:378,gy:464,n:'埋藏宝藏',r:'西港',d:'埋藏宝藏 · 掉落: [8 x 电子器件, 20 x 铁]'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:386,gy:478,n:'狗屋',r:'西港',d:'狗屋'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:455,gy:476,n:'奇异钓点',r:'西港',d:'钓鱼点 · 奇异钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:583,gy:465,n:'重工业区',r:'中枢',d:'营火重工业区'},
  {tp:'resource',ic:'icon-lock3',cl:'#ef4444',gx:607,gy:468,n:'大师撬锁工具',r:'中枢',d:'上锁的门大师撬锁工具'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:609,gy:467,n:'收音机',r:'中枢',d:'收音机'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:725,gy:477,n:'收音机',r:'中枢',d:'收音机'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:782,gy:473,n:'收音机',r:'中枢',d:'收音机'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:810,gy:460,n:'To: Pitbull Shelter',r:'中枢',d:'埋藏宝藏To: Pitbull Shelter'},
  {tp:'resource',ic:'icon-myth-tablet',cl:'#f0abfc',gx:878,gy:463,n:'神秘石碑',r:'王冠',d:'神秘石碑'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:881,gy:466,n:'王冠 Office',r:'王冠',d:'音频日志王冠 Office'},
  {tp:'resource',ic:'icon-lock',cl:'#94a3b8',gx:965,gy:472,n:'Launchpad Key',r:'王冠',d:'上锁的门Launchpad Key'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:963,gy:477,n:'王冠 Honesty',r:'王冠',d:'音频日志王冠 Honesty'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:984,gy:473,n:'王冠站天桥',r:'王冠',d:'营火王冠站天桥'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:1049,gy:462,n:'狗屋',r:'王冠',d:'狗屋'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1123,gy:475,n:'废弃化工厂外部',r:'王冠',d:'营火废弃化工厂外部'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:1131,gy:465,n:'神力裂隙',r:'王冠',d:'神力裂隙'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1151,gy:468,n:'限时箱子',r:'王冠',d:'限时箱子 · 限时: 5 秒 奖励: [1 x 蓝眼球宝珠]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1167,gy:471,n:'化工厂加固结构附近',r:'王冠',d:'营火化工厂加固结构附近'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1314,gy:472,n:'湖边小屋',r:'柴火',d:'营火湖边小屋'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1317,gy:464,n:'埋藏宝藏',r:'柴火',d:'埋藏宝藏 · 掉落: [6 x 骨头]'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:1409,gy:465,n:'To: Snakes on a Park',r:'柴火',d:'埋藏宝藏To: Snakes on a Park'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:1479,gy:461,n:'可耕种地',r:'通用',d:'可耕种地'},
  {tp:'resource',ic:'icon-link-relay',cl:'#fb923c',gx:1491,gy:461,n:'链接中继站',r:'卡纳维拉尔',d:'链接中继站'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1485,gy:461,n:'帕卡德家族农场',r:'卡纳维拉尔',d:'营火帕卡德家族农场'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1484,gy:463,n:'初级农作物',r:'卡纳维拉尔',qid:'q_farming',qt:'side',d:'支线任务初级农作物'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:1482,gy:460,n:'可耕种地',r:'通用',d:'可耕种地'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:1482,gy:464,n:'可耕种地',r:'通用',d:'可耕种地'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:1480,gy:464,n:'可耕种地',r:'通用',d:'可耕种地'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:1529,gy:478,n:'神力裂隙',r:'卡纳维拉尔',d:'神力裂隙'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:145,gy:497,n:'Toxic Spot',r:'瓦肯镇',d:'钓鱼点Toxic Spot'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:205,gy:483,n:'沙滩派对',r:'瓦肯镇',d:'营火沙滩派对'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:213,gy:482,n:'优质钓点',r:'瓦肯镇',d:'钓鱼点 · 优质钓点'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:324,gy:490,n:'限时箱子',r:'西港',d:'限时箱子 · 限时: 20 秒 奖励: [8 x 电子器件, 12 x 钢, 20 x 陶瓷]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:352,gy:499,n:'优质钓点',r:'西港',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:537,gy:487,n:'狗屋',r:'西港',d:'狗屋'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:552,gy:484,n:'神力裂隙',r:'西港',d:'神力裂隙'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:703,gy:492,n:'被摧毁的建筑',r:'中枢',d:'营火被摧毁的建筑'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:726,gy:481,n:'限时箱子',r:'中枢',d:'限时箱子 · 限时: 7 秒 奖励: [12 x 电子器件, 4 x 钢]'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:793,gy:488,n:'收音机',r:'中枢',d:'收音机'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:812,gy:493,n:'收音机',r:'中枢',d:'收音机'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:890,gy:492,n:'堡垒营火',r:'王冠',d:'营火堡垒营火'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:941,gy:496,n:'埋藏宝藏',r:'王冠',d:'埋藏宝藏 · 掉落: [5 x 神力珠]'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:1011,gy:480,n:'王冠 Mana',r:'王冠',d:'音频日志王冠 Mana'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:1018,gy:481,n:'Entrance Launchpad Tunnel West',r:'王冠',d:'入口通道Entrance Launchpad Tunnel West'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:1036,gy:499,n:'Entrance Launchpad Tunnel South',r:'王冠',d:'入口通道Entrance Launchpad Tunnel South'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:1162,gy:499,n:'Chemical Plant Reinforced Structure 终端',r:'王冠',d:'终端Chemical Plant Reinforced Structure 终端'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:1175,gy:491,n:'邪恶跳跃者',r:'王冠',d:'BOSS · 邪恶跳跃者'},
  {tp:'resource',ic:'icon-myth-tablet',cl:'#f0abfc',gx:1256,gy:483,n:'神秘石碑',r:'柴火',d:'神秘石碑'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1326,gy:485,n:'普通钓点',r:'迦百农',d:'钓鱼点 · 普通钓点'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:1377,gy:499,n:'To: First Pet',r:'迦百农',d:'埋藏宝藏To: First Pet'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1462,gy:498,n:'埋藏宝藏',r:'卡纳维拉尔',d:'埋藏宝藏 · 掉落: [1 x Scrap 织物, 1 x Scrap 织物, 1 x Scrap 织物]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1510,gy:489,n:'限时箱子',r:'卡纳维拉尔',d:'限时箱子 · 限时: 15 秒 奖励: [12 x 电子器件, 25 x 钢, 3 x 大米]'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:1509,gy:490,n:'神力裂隙',r:'卡纳维拉尔',d:'神力裂隙'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1557,gy:495,n:'限时箱子',r:'卡纳维拉尔',d:'限时箱子 · 限时: 20 秒 奖励: [2 x 铁, 8 x 陶瓷]'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1559,gy:487,n:'收音机',r:'卡纳维拉尔',d:'收音机'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:1565,gy:496,n:'狗屋',r:'卡纳维拉尔',d:'狗屋'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:133,gy:519,n:'有毒水池旁',r:'瓦肯镇',d:'营火有毒水池旁'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:210,gy:510,n:'传奇钓点',r:'瓦肯镇',d:'钓鱼点 · 传奇钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:259,gy:502,n:'优质钓点',r:'瓦肯镇',d:'钓鱼点 · 优质钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:268,gy:518,n:'传奇钓点',r:'瓦肯镇',d:'钓鱼点 · 传奇钓点'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:272,gy:506,n:'神力裂隙',r:'瓦肯镇',d:'神力裂隙'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:274,gy:517,n:'限时箱子',r:'瓦肯镇',d:'限时箱子 · 限时: 32 秒 奖励: [1 x 神力珠, 8 x 大米]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:309,gy:516,n:'传奇钓点',r:'西港',d:'钓鱼点 · 传奇钓点'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:576,gy:516,n:'光辉通道',r:'中枢',d:'古墓 · 光辉通道'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:613,gy:513,n:'普通钓点',r:'中枢',d:'钓鱼点 · 普通钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:682,gy:509,n:'传奇钓点',r:'中枢',d:'钓鱼点 · 传奇钓点'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:751,gy:516,n:'狗屋',r:'中枢',d:'狗屋'},
  {tp:'resource',ic:'icon-lock3',cl:'#ef4444',gx:816,gy:512,n:'大师撬锁工具',r:'中枢',d:'上锁的门大师撬锁工具'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:878,gy:502,n:'王冠 Mansion',r:'王冠',d:'音频日志王冠 Mansion'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1025,gy:508,n:'山峰上的泄漏',r:'王冠',qid:'q_leak',qt:'side',d:'支线任务山峰上的泄漏'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:1094,gy:510,n:'首领狼',r:'王冠',d:'BOSS · 首领狼'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:1086,gy:511,n:'首领狼',r:'王冠',d:'BOSS · 首领狼'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1261,gy:520,n:'收音机',r:'王冠',d:'收音机'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:1330,gy:507,n:'古墓',r:'迦百农',d:'古墓'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1329,gy:512,n:'基础撬锁工具',r:'迦百农',d:'上锁的门基础撬锁工具'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1330,gy:512,n:'基础撬锁工具',r:'迦百农',d:'上锁的门基础撬锁工具'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:1364,gy:512,n:'狗屋',r:'迦百农',d:'狗屋'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1365,gy:518,n:'初级必需品',r:'迦百农',qid:'q_basic',qt:'side',d:'支线任务初级必需品'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1406,gy:510,n:'收音机',r:'迦百农',d:'收音机'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1407,gy:513,n:'基础撬锁工具',r:'迦百农',d:'上锁的门基础撬锁工具'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1410,gy:509,n:'基础撬锁工具',r:'迦百农',d:'上锁的门基础撬锁工具'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1419,gy:514,n:'变强',r:'迦百农',qid:'q_stronger',qt:'side',d:'支线任务变强'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1421,gy:514,n:'郊区货车场',r:'迦百农',d:'营火郊区货车场'},
  {tp:'resource',ic:'icon-lock3',cl:'#ef4444',gx:1617,gy:514,n:'大师撬锁工具',r:'卡纳维拉尔',d:'上锁的门大师撬锁工具'},
  {tp:'resource',ic:'icon-lock2',cl:'#fb923c',gx:1611,gy:512,n:'专家撬锁工具',r:'卡纳维拉尔',d:'上锁的门专家撬锁工具'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:1612,gy:507,n:'Gembine',r:'卡纳维拉尔',d:'终端Gembine'},
  {tp:'resource',ic:'icon-lock2',cl:'#fb923c',gx:1626,gy:513,n:'专家撬锁工具',r:'卡纳维拉尔',d:'上锁的门专家撬锁工具'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1658,gy:508,n:'优质钓点',r:'卡纳维拉尔',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:158,gy:529,n:'Volcano Passage 终端',r:'瓦肯镇',d:'终端Volcano Passage 终端'},
  {tp:'resource',ic:'icon-lock',cl:'#94a3b8',gx:157,gy:532,n:'Volcano Passage 入口通道 Key',r:'瓦肯镇',d:'上锁的门Volcano Passage 入口通道 Key'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:234,gy:521,n:'神力裂隙',r:'瓦肯镇',d:'神力裂隙'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:326,gy:526,n:'普通钓点',r:'西港',d:'钓鱼点 · 普通钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:373,gy:526,n:'传奇钓点',r:'西港',d:'钓鱼点 · 传奇钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:809,gy:531,n:'中枢南部办公楼',r:'中枢',d:'营火中枢南部办公楼'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:808,gy:520,n:'收音机',r:'中枢',d:'收音机'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:980,gy:530,n:'传奇钓点',r:'王冠',d:'钓鱼点 · 传奇钓点'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:962,gy:522,n:'许愿井',r:'王冠',d:'许愿井'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:991,gy:530,n:'埋藏宝藏',r:'王冠',d:'埋藏宝藏 · 掉落: [3 x 神力珠]'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:1261,gy:522,n:'Menzies\' Pass Eastern Gate 终端',r:'王冠',d:'终端Menzies\' Pass Eastern Gate 终端'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1341,gy:536,n:'收音机',r:'迦百农',d:'收音机'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1365,gy:521,n:'家园郊区',r:'迦百农',d:'营火家园郊区'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1362,gy:537,n:'棒球',r:'迦百农',qid:'q_basketball',qt:'side',d:'主线任务棒球'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:1391,gy:527,n:'迦百农',r:'迦百农',d:'链塔 · 迦百农'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1424,gy:535,n:'基础撬锁工具',r:'迦百农',d:'上锁的门基础撬锁工具'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1430,gy:533,n:'埋藏宝藏',r:'迦百农',d:'埋藏宝藏 · 掉落: [1 x 铁, 1 x 铁, 1 x 铁, 1 x 塑料s, 1 x 塑料s, 1 x 陶瓷, 1 x 陶瓷, 1 x 橡胶, 1 x 橡胶]'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:1444,gy:527,n:'假守门人',r:'迦百农',d:'BOSS · 假守门人'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:1506,gy:539,n:'古墓',r:'卡纳维拉尔',d:'古墓'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1573,gy:525,n:'撤离地点入口',r:'卡纳维拉尔',d:'营火撤离地点入口'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:1600,gy:523,n:'Outer Gate 终端',r:'卡纳维拉尔',d:'终端Outer Gate 终端'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:1608,gy:537,n:'卡纳维拉尔',r:'卡纳维拉尔',d:'链塔 · 卡纳维拉尔'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1613,gy:526,n:'航空中心内院',r:'卡纳维拉尔',d:'营火航空中心内院'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:1620,gy:524,n:'Inner Gate 终端',r:'卡纳维拉尔',d:'终端Inner Gate 终端'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1625,gy:537,n:'限时箱子',r:'卡纳维拉尔',d:'限时箱子 · 限时: 10 秒 奖励: [12 x 铁, 6 x 织物]'},
  {tp:'resource',ic:'icon-lock2',cl:'#fb923c',gx:1625,gy:522,n:'专家撬锁工具',r:'卡纳维拉尔',d:'上锁的门专家撬锁工具'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:100,gy:542,n:'传奇钓点',r:'瓦肯镇',d:'钓鱼点 · 传奇钓点'},
  {tp:'resource',ic:'icon-hatch',cl:'#a78bfa',gx:118,gy:552,n:'Shelter',r:'瓦肯镇',d:'Shelter'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:115,gy:542,n:'埋藏宝藏',r:'瓦肯镇',d:'埋藏宝藏 · 掉落: [1 x 神力珠, 10 x 橡胶]'},
  {tp:'resource',ic:'icon-shelter-loudspeaker',cl:'#86efac',gx:137,gy:544,n:'Shelter 瓦肯镇 扬声器',r:'瓦肯镇',d:'避难所扬声器Shelter 瓦肯镇 扬声器'},
  {tp:'resource',ic:'icon-myth-tablet',cl:'#f0abfc',gx:375,gy:546,n:'神秘石碑',r:'西港',d:'神秘石碑'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:624,gy:550,n:'普通钓点',r:'索拉里斯星',d:'钓鱼点 · 普通钓点'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:630,gy:545,n:'埋藏宝藏',r:'索拉里斯星',d:'埋藏宝藏 · 掉落: [5 x 钢, 2 x 肉类, 2 x 橡胶]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:655,gy:553,n:'埋藏宝藏',r:'索拉里斯星',d:'埋藏宝藏 · 掉落: [20 x 陶瓷, 12 x 木料]'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:647,gy:557,n:'吊桥',r:'索拉里斯星',d:'吊桥'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:732,gy:558,n:'优质钓点',r:'夕阳沙漠',d:'钓鱼点 · 优质钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:829,gy:544,n:'普通钓点',r:'峡谷',d:'钓鱼点 · 普通钓点'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1093,gy:551,n:'需要任务: 雪地 [支线任务]',r:'峡谷',d:'埋藏宝藏 · 需要任务: 雪地 [支线任务]掉落: [2 x 骨头, 4 x 铁, 2 x 电子器件]'},
  {tp:'resource',ic:'icon-hatch',cl:'#a78bfa',gx:1334,gy:559,n:'Shelter',r:'迦百农',d:'Shelter'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1330,gy:550,n:'家庭避难所',r:'迦百农',d:'营火家庭避难所'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1335,gy:540,n:'撬棍摧毁障碍物',r:'迦百农',qid:'q_crowbar',qt:'side',d:'主线任务撬棍摧毁障碍物'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1353,gy:555,n:'限时箱子',r:'迦百农',d:'限时箱子 · 限时: 13 秒 奖励: [1 x 神力珠, 8 x 电子器件, 8 x 废弃电子, 8 x 钢, 16 x 陶瓷]'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:1347,gy:555,n:'神力裂隙',r:'迦百农',d:'神力裂隙'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1382,gy:553,n:'收音机',r:'迦百农',d:'收音机'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1413,gy:548,n:'埋藏宝藏',r:'迦百农',d:'埋藏宝藏 · 掉落: [1 x 铁, 1 x 铁, 1 x 铁, 1 x 塑料s, 1 x 塑料s, 1 x 陶瓷, 1 x 陶瓷, 1 x 橡胶, 1 x 橡胶]'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1425,gy:542,n:'基础撬锁工具',r:'迦百农',d:'上锁的门基础撬锁工具'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1421,gy:547,n:'基础撬锁工具',r:'迦百农',d:'上锁的门基础撬锁工具'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:1426,gy:552,n:'To: Trapped Snack Chasers',r:'迦百农',d:'埋藏宝藏To: Trapped Snack Chasers'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:1481,gy:554,n:'To: The Teleportation Test',r:'卡纳维拉尔',d:'埋藏宝藏To: The Teleportation Test'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:1567,gy:544,n:'狗屋',r:'卡纳维拉尔',d:'狗屋'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1599,gy:553,n:'收音机',r:'卡纳维拉尔',d:'收音机'},
  {tp:'resource',ic:'icon-lock2',cl:'#fb923c',gx:1614,gy:549,n:'专家撬锁工具',r:'卡纳维拉尔',d:'上锁的门专家撬锁工具'},
  {tp:'resource',ic:'icon-lock2',cl:'#fb923c',gx:1616,gy:554,n:'专家撬锁工具',r:'卡纳维拉尔',d:'上锁的门专家撬锁工具'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:183,gy:573,n:'瓦肯古城遗址附近',r:'瓦肯镇',d:'营火瓦肯古城遗址附近'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:210,gy:574,n:'优质钓点',r:'瓦肯镇',d:'钓鱼点 · 优质钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:500,gy:571,n:'沙漠卡车停靠站营火',r:'索拉里斯星',d:'营火沙漠卡车停靠站营火'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:623,gy:565,n:'所需材料: [10 x 稀有木材]',r:'索拉里斯星',d:'可修复所需材料: [10 x 稀有木材]'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:671,gy:570,n:'许愿井',r:'夕阳沙漠',d:'许愿井'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:695,gy:576,n:'干涸农场',r:'夕阳沙漠',d:'营火干涸农场'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:840,gy:576,n:'埋藏宝藏',r:'峡谷',d:'埋藏宝藏 · 掉落: [3 x 铁, 5 x 橡胶]'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:924,gy:567,n:'归来的过去',r:'峡谷',d:'古墓 · 归来的过去'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1053,gy:572,n:'埋藏宝藏',r:'峡谷',d:'埋藏宝藏 · 掉落: [1 x Plant Matter, 1 x Plant Matter, 5 x 铁, 1 x 塑料s]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1100,gy:561,n:'需要任务: 雪地 [支线任务]',r:'峡谷',d:'埋藏宝藏 · 需要任务: 雪地 [支线任务]掉落: [2 x 骨头, 2 x 钢]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1091,gy:563,n:'需要任务: 雪地 [支线任务]',r:'峡谷',d:'埋藏宝藏 · 需要任务: 雪地 [支线任务]掉落: [2 x 骨头, 2 x 橡胶, 1 x 钢]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1104,gy:567,n:'需要任务: 雪地 [支线任务]',r:'峡谷',d:'埋藏宝藏 · 需要任务: 雪地 [支线任务]掉落: [2 x 骨头, 2 x 橡胶, 1 x 塑料s]'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1173,gy:564,n:'收音机',r:'王冠',d:'收音机'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:1172,gy:568,n:'Menzies\' Pass Southern Gate 终端',r:'王冠',d:'终端Menzies\' Pass Southern Gate 终端'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:1169,gy:573,n:'神力裂隙',r:'王冠',d:'神力裂隙'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1278,gy:561,n:'埋藏宝藏',r:'篱笆地',d:'埋藏宝藏 · 掉落: [1 x 神力珠, 3 x 骨头]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1440,gy:564,n:'限时箱子',r:'篱笆地',d:'限时箱子 · 限时: 19 秒 奖励: [6 x 铁, 6 x 木料]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1529,gy:561,n:'埋藏宝藏',r:'卡纳维拉尔',d:'埋藏宝藏 · 掉落: [4 x 铁]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1594,gy:570,n:'限时箱子',r:'卡纳维拉尔',d:'限时箱子 · 限时: 16 秒 奖励: [2 x 铁, 10 x Scrap 木料]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1633,gy:562,n:'限时箱子',r:'卡纳维拉尔',d:'限时箱子 · 限时: 14 秒 奖励: [15 x 电子器件, 3 x 钛]'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1637,gy:579,n:'吊桥',r:'卡纳维拉尔',d:'吊桥'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:1654,gy:578,n:'To: Preservation Hub',r:'卡纳维拉尔',d:'埋藏宝藏To: Preservation Hub'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:312,gy:592,n:'传奇钓点',r:'索拉里斯星',d:'钓鱼点 · 传奇钓点'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:395,gy:598,n:'许愿井',r:'索拉里斯星',d:'许愿井'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:518,gy:584,n:'Gembine',r:'索拉里斯星',d:'终端Gembine'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:612,gy:594,n:'埋藏宝藏',r:'索拉里斯星',d:'埋藏宝藏 · 掉落: [1 x 钛, 10 x 神力珠]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:656,gy:591,n:'限时箱子',r:'索拉里斯星',d:'限时箱子 · 限时: 27 秒 奖励: [20 x 稀有木材, 10 x 织物]'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:878,gy:598,n:'初级冶金厂',r:'峡谷',qid:'q_smelter',qt:'side',d:'支线任务初级冶金厂'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:896,gy:599,n:'西部切割营火',r:'峡谷',d:'营火西部切割营火'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:952,gy:591,n:'神力裂隙',r:'峡谷',d:'神力裂隙'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:958,gy:589,n:'埋藏宝藏',r:'峡谷',d:'埋藏宝藏 · 掉落: [6 x Superior Salmon]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:966,gy:595,n:'埋藏宝藏',r:'峡谷',d:'埋藏宝藏 · 掉落: [6 x 橡胶, 2 x 塑料s]'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:974,gy:599,n:'神力裂隙',r:'峡谷',d:'神力裂隙'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:997,gy:593,n:'收音机',r:'峡谷',d:'收音机'},
  {tp:'resource',ic:'icon-lock2',cl:'#fb923c',gx:991,gy:594,n:'专家撬锁工具',r:'峡谷',d:'上锁的门专家撬锁工具'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:997,gy:590,n:'危险追捕者',r:'峡谷',d:'BOSS · 危险追捕者'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1038,gy:587,n:'普通钓点',r:'峡谷',d:'钓鱼点 · 普通钓点'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:1048,gy:597,n:'峡谷',r:'峡谷',d:'链塔 · 峡谷'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1052,gy:599,n:'破碎链塔',r:'峡谷',qid:'q_brokentwr',qt:'side',d:'支线任务破碎链塔'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1052,gy:598,n:'基础撬锁工具',r:'峡谷',d:'上锁的门基础撬锁工具'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1087,gy:588,n:'芬彻汽车回收站',r:'峡谷',d:'营火芬彻汽车回收站'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1081,gy:584,n:'吊桥',r:'峡谷',d:'吊桥'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1109,gy:599,n:'埋藏宝藏',r:'峡谷',d:'埋藏宝藏 · 掉落: [3 x 铁, 5 x 橡胶]'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:1317,gy:591,n:'To: Desert Fight Field',r:'篱笆地',d:'埋藏宝藏To: Desert Fight Field'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:1348,gy:592,n:'可耕种地',r:'通用',d:'可耕种地'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:1353,gy:594,n:'可耕种地',r:'通用',d:'可耕种地'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:1352,gy:592,n:'可耕种地',r:'通用',d:'可耕种地'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:1342,gy:599,n:'狗屋',r:'篱笆地',d:'狗屋'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:1356,gy:592,n:'可耕种地',r:'通用',d:'可耕种地'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:1350,gy:594,n:'可耕种地',r:'通用',d:'可耕种地'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:1376,gy:592,n:'神力裂隙',r:'篱笆地',d:'神力裂隙'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1545,gy:600,n:'鲍尔湖营地',r:'卡纳维拉尔',d:'营火鲍尔湖营地'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:1573,gy:583,n:'To: Poodle Park',r:'卡纳维拉尔',d:'埋藏宝藏To: Poodle Park'},
  {tp:'resource',ic:'icon-arena-obelisk',cl:'#f0abfc',gx:1603,gy:580,n:'Wave 1 奖励: [20 x Scrap 木料]',r:'卡纳维拉尔',d:'竞技场方尖碑Wave 1 奖励: [20 x Scrap 木料]Wave 2 奖励: [15 x Scrap 金属]Wave 3 奖励: [10 x Scrap 织物]Wave 4 奖励: [8 x 木料]Wave 5 奖励: [8 x 铁]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1619,gy:597,n:'普通钓点',r:'卡纳维拉尔',d:'钓鱼点 · 普通钓点'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:145,gy:606,n:'瓦肯镇',r:'瓦肯镇',d:'链塔 · 瓦肯镇'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:283,gy:610,n:'索拉里斯火车站营火',r:'索拉里斯星',d:'营火索拉里斯火车站营火'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:510,gy:620,n:'吊桥',r:'索拉里斯星',d:'吊桥'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:628,gy:613,n:'神力裂隙',r:'索拉里斯星',d:'神力裂隙'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:659,gy:613,n:'传奇钓点',r:'索拉里斯星',d:'钓鱼点 · 传奇钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:683,gy:612,n:'优质钓点',r:'夕阳沙漠',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-arena-obelisk',cl:'#f0abfc',gx:739,gy:610,n:'Wave 1 奖励: [18 x 木料]',r:'夕阳沙漠',d:'竞技场方尖碑Wave 1 奖励: [18 x 木料]Wave 2 奖励: [10 x 橡胶]Wave 3 奖励: [5 x 钢]Wave 4 奖励: [3 x 稀有木材]Wave 5 奖励: [1 x 神力珠]'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:916,gy:612,n:'收音机',r:'峡谷',d:'收音机'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:986,gy:614,n:'神力裂隙',r:'峡谷',d:'神力裂隙'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1019,gy:611,n:'庇护农场营地',r:'峡谷',d:'营火庇护农场营地'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:1055,gy:609,n:'许愿井',r:'峡谷',d:'许愿井'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1081,gy:617,n:'埋藏宝藏',r:'峡谷',d:'埋藏宝藏 · 掉落: [2 x 铁, 2 x 塑料s, 3 x 橡胶]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1148,gy:606,n:'普通钓点',r:'峡谷',d:'钓鱼点 · 普通钓点'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1211,gy:618,n:'限时箱子',r:'篱笆地',d:'限时箱子 · 限时: 25 秒 奖励: [3 x 兽皮, 6 x 织物]'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:1242,gy:617,n:'To: Treat Path Park',r:'篱笆地',d:'埋藏宝藏To: Treat Path Park'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1263,gy:606,n:'埋藏宝藏',r:'篱笆地',d:'埋藏宝藏 · 掉落: [5 x 铁]'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:1373,gy:618,n:'神力裂隙',r:'篱笆地',d:'神力裂隙'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1443,gy:601,n:'埋藏宝藏',r:'篱笆地',d:'埋藏宝藏 · 掉落: [4 x 木料]'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1477,gy:607,n:'收音机',r:'篱笆地',d:'收音机'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1494,gy:615,n:'南部墓地',r:'篱笆地',d:'营火南部墓地'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1538,gy:616,n:'普通钓点',r:'篱笆地',d:'钓鱼点 · 普通钓点'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:1556,gy:614,n:'许愿井',r:'篱笆地',d:'许愿井'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1621,gy:613,n:'限时箱子',r:'卡纳维拉尔',d:'限时箱子 · 限时: 20 秒 奖励: [8 x 木料, 4 x 陶瓷]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:248,gy:621,n:'普通钓点',r:'索拉里斯星',d:'钓鱼点 · 普通钓点'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:285,gy:623,n:'头冷脚热',r:'索拉里斯星',qid:'q_coolhead',qt:'side',d:'支线任务头冷脚热'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:316,gy:636,n:'埋藏宝藏',r:'索拉里斯星',d:'埋藏宝藏 · 掉落: [5 x 钢, 10 x 橡胶]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:907,gy:635,n:'普通钓点',r:'峡谷',d:'钓鱼点 · 普通钓点'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:949,gy:631,n:'限时箱子',r:'峡谷',d:'限时箱子 · 限时: 20 秒 奖励: [1 x 钛, 2 x 织物]'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:948,gy:621,n:'狗屋',r:'峡谷',d:'狗屋'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1002,gy:624,n:'埋藏宝藏',r:'峡谷',d:'埋藏宝藏 · 掉落: [5 x 铁, 2 x 橡胶]'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:1156,gy:623,n:'To: Chartreux Test',r:'峡谷',d:'埋藏宝藏To: Chartreux Test'},
  {tp:'resource',ic:'icon-link-relay',cl:'#fb923c',gx:1215,gy:635,n:'链接中继站',r:'篱笆地',d:'链接中继站'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1273,gy:628,n:'限时箱子',r:'篱笆地',d:'限时箱子 · 限时: 7 秒 奖励: [4 x 织物, 5 x 铁]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1290,gy:635,n:'灰港',r:'篱笆地',d:'营火灰港'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1289,gy:626,n:'收音机',r:'篱笆地',d:'收音机'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:1397,gy:637,n:'篱笆地',r:'篱笆地',d:'链塔 · 篱笆地'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1391,gy:626,n:'南部发电站',r:'篱笆地',d:'营火南部发电站'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:1454,gy:626,n:'古墓 of The Hungry King',r:'篱笆地',d:'古墓古墓 of The Hungry King'},
  {tp:'resource',ic:'icon-link-relay',cl:'#fb923c',gx:1459,gy:632,n:'链接中继站',r:'篱笆地',d:'链接中继站'},
  {tp:'resource',ic:'icon-lock',cl:'#94a3b8',gx:1467,gy:631,n:'Graveyard Key',r:'篱笆地',d:'上锁的门Graveyard Key'},
  {tp:'resource',ic:'icon-lock',cl:'#94a3b8',gx:1467,gy:630,n:'Graveyard Key',r:'篱笆地',d:'上锁的门Graveyard Key'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1479,gy:636,n:'需要任务: 墓地 [支线任务]',r:'篱笆地',d:'埋藏宝藏 · 需要任务: 墓地 [支线任务]Key 掉落: [Graveyard Key]'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1487,gy:626,n:'墓地',r:'篱笆地',qid:'q_graveyard',qt:'side',d:'支线任务墓地'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1590,gy:626,n:'基础撬锁工具',r:'篱笆地',d:'上锁的门基础撬锁工具'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1596,gy:627,n:'基础撬锁工具',r:'篱笆地',d:'上锁的门基础撬锁工具'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1630,gy:638,n:'优质钓点',r:'卡纳维拉尔',d:'钓鱼点 · 优质钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1655,gy:629,n:'海角通道',r:'卡纳维拉尔',d:'营火海角通道'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:1678,gy:632,n:'Dlc 1 Entrance',r:'卡纳维拉尔',d:'入口通道Dlc 1 Entrance'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1704,gy:630,n:'吊桥',r:'卡纳维拉尔',d:'吊桥'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:597,gy:660,n:'奇异钓点',r:'索拉里斯星',d:'钓鱼点 · 奇异钓点'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:639,gy:650,n:'无路可走',r:'夕阳沙漠',qid:'q_nowhere',qt:'key',d:'支线任务无路可走'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:686,gy:643,n:'收音机',r:'夕阳沙漠',d:'收音机'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:822,gy:641,n:'收音机',r:'夕阳沙漠',d:'收音机'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:824,gy:656,n:'返航',r:'夕阳沙漠',qid:'q_voyage',qt:'side',d:'支线任务返航'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:840,gy:641,n:'皮玛镇外围',r:'夕阳沙漠',d:'营火皮玛镇外围'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:895,gy:641,n:'To: Heeler Hunt',r:'夕阳沙漠',d:'埋藏宝藏To: Heeler Hunt'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:952,gy:645,n:'基础撬锁工具',r:'峡谷',d:'上锁的门基础撬锁工具'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:944,gy:650,n:'埋藏宝藏',r:'峡谷',d:'埋藏宝藏 · 掉落: [3 x 铁, 2 x 钢, 3 x 橡胶, 2 x 塑料s]'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:997,gy:648,n:'雪地',r:'峡谷',qid:'q_snowfield',qt:'side',d:'支线任务雪地'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:996,gy:641,n:'神力裂隙',r:'峡谷',d:'神力裂隙'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1050,gy:646,n:'普通钓点',r:'峡谷',d:'钓鱼点 · 普通钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1090,gy:643,n:'地下田野',r:'峡谷',d:'营火地下田野'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1098,gy:649,n:'收音机',r:'峡谷',d:'收音机'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1130,gy:644,n:'优质钓点',r:'峡谷',d:'钓鱼点 · 优质钓点'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1193,gy:652,n:'损坏的南方终端',r:'篱笆地',qid:'q_terminal_s',qt:'key',d:'支线任务损坏的南方终端'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:1192,gy:652,n:'Wall Checkpoint Rho 终端',r:'篱笆地',d:'终端Wall Checkpoint Rho 终端'},
  {tp:'resource',ic:'icon-myth-tablet',cl:'#f0abfc',gx:1218,gy:641,n:'神秘石碑',r:'篱笆地',d:'神秘石碑'},
  {tp:'resource',ic:'icon-lock2',cl:'#fb923c',gx:1262,gy:643,n:'专家撬锁工具',r:'篱笆地',d:'上锁的门专家撬锁工具'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1278,gy:645,n:'收音机',r:'篱笆地',d:'收音机'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:1300,gy:648,n:'狗屋',r:'篱笆地',d:'狗屋'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1351,gy:649,n:'收音机',r:'篱笆地',d:'收音机'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1596,gy:645,n:'埋藏宝藏',r:'篱笆地',d:'埋藏宝藏 · 掉落: [5 x 织物]'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:1731,gy:647,n:'Island 海角通道 Entrance',r:'卡纳维拉尔',d:'入口通道Island 海角通道 Entrance'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:507,gy:676,n:'索拉里斯农场营火',r:'索拉里斯星',d:'营火索拉里斯农场营火'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:516,gy:667,n:'狗屋',r:'索拉里斯星',d:'狗屋'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:659,gy:660,n:'夕阳沙漠',r:'夕阳沙漠',d:'链塔 · 夕阳沙漠'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:665,gy:672,n:'钻石矿',r:'夕阳沙漠',d:'营火钻石矿'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:750,gy:663,n:'埋藏宝藏',r:'夕阳沙漠',d:'埋藏宝藏 · 掉落: [16 x 钢]'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:758,gy:663,n:'To: Bengal Stadium',r:'夕阳沙漠',d:'埋藏宝藏To: Bengal Stadium'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:916,gy:678,n:'埋藏宝藏',r:'夕阳沙漠',d:'埋藏宝藏 · 掉落: [10 x 钢, 8 x 电子器件]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:948,gy:674,n:'普通钓点',r:'峡谷',d:'钓鱼点 · 普通钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1002,gy:678,n:'溪流桥营火',r:'峡谷',d:'营火溪流桥营火'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1058,gy:664,n:'埋藏宝藏',r:'峡谷',d:'埋藏宝藏 · 掉落: [3 x 铁, 3 x 橡胶]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1115,gy:676,n:'限时箱子',r:'峡谷',d:'限时箱子 · 限时: 15 秒 奖励: [3 x 兽皮, 6 x 织物]'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1153,gy:668,n:'逃跑路径',r:'峡谷',qid:'q_getaway',qt:'side',d:'支线任务逃跑路径'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1151,gy:679,n:'基础撬锁工具',r:'峡谷',d:'上锁的门基础撬锁工具'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1171,gy:661,n:'蓝色池塘汽车旅馆',r:'峡谷',d:'营火蓝色池塘汽车旅馆'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:1169,gy:677,n:'狗屋',r:'峡谷',d:'狗屋'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1234,gy:676,n:'埋藏宝藏',r:'篱笆地',d:'埋藏宝藏 · 掉落: [1 x 兽皮, 1 x 兽皮, 1 x 兽皮, 1 x 兽皮]'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:1380,gy:664,n:'许愿井',r:'篱笆地',d:'许愿井'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1416,gy:669,n:'普通钓点',r:'篱笆地',d:'钓鱼点 · 普通钓点'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1509,gy:666,n:'埋藏宝藏',r:'篱笆地',d:'埋藏宝藏 · 掉落: [6 x 铁, 4 x 织物]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:236,gy:690,n:'普通钓点',r:'索拉里斯星',d:'钓鱼点 · 普通钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:318,gy:695,n:'军事公路营火',r:'索拉里斯星',d:'营火军事公路营火'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:575,gy:687,n:'优质钓点',r:'夕阳沙漠',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-myth-tablet',cl:'#f0abfc',gx:593,gy:689,n:'神秘石碑',r:'夕阳沙漠',d:'神秘石碑'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:835,gy:685,n:'狗屋',r:'夕阳沙漠',d:'狗屋'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1005,gy:688,n:'吊桥',r:'峡谷',d:'吊桥'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1073,gy:696,n:'普通钓点',r:'峡谷',d:'钓鱼点 · 普通钓点'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1151,gy:688,n:'埋藏宝藏',r:'峡谷',d:'埋藏宝藏 · 掉落: [1 x 铁, 1 x 铁, 1 x 铁, 1 x 塑料s, 1 x 塑料s, 1 x 陶瓷, 1 x 陶瓷, 1 x 橡胶, 1 x 橡胶]'},
  {tp:'resource',ic:'icon-hatch',cl:'#a78bfa',gx:1286,gy:685,n:'Shelter',r:'篱笆地',d:'Shelter'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1339,gy:686,n:'埋藏宝藏',r:'篱笆地',d:'埋藏宝藏 · 掉落: [1 x 织物, 1 x 织物, 1 x 织物]'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:1415,gy:694,n:'沼泽草地 Gate 终端',r:'篱笆地',d:'终端沼泽草地 Gate 终端'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1479,gy:686,n:'限时箱子',r:'篱笆地',d:'限时箱子 · 限时: 20 秒 奖励: [10 x 木料, 6 x 织物]'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:538,gy:716,n:'收音机',r:'夕阳沙漠',d:'收音机'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:570,gy:714,n:'埋藏宝藏',r:'夕阳沙漠',d:'埋藏宝藏 · 掉落: [1 x 钛, 8 x 钢, 12 x 织物, 12 x 废弃电子]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:785,gy:715,n:'埋藏宝藏',r:'夕阳沙漠',d:'埋藏宝藏 · 掉落: [8 x 木料, 20 x 神力珠, 8 x 橡胶]'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:859,gy:711,n:'吊桥',r:'夕阳沙漠',d:'吊桥'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1036,gy:709,n:'优质钓点',r:'峡谷',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-terminal',cl:'#4ade80',gx:1190,gy:708,n:'终端',r:'峡谷',d:'终端'},
  {tp:'resource',ic:'icon-shelter-loudspeaker',cl:'#86efac',gx:1290,gy:706,n:'Shelter 篱笆地 扬声器',r:'篱笆地',d:'避难所扬声器Shelter 篱笆地 扬声器'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1326,gy:719,n:'传奇钓点',r:'篱笆地',d:'钓鱼点 · 传奇钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1356,gy:714,n:'普通钓点',r:'篱笆地',d:'钓鱼点 · 普通钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1366,gy:716,n:'沼泽草地湾',r:'篱笆地',d:'营火沼泽草地湾'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1606,gy:718,n:'达罗堡',r:'沼泽草地',d:'营火达罗堡'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1657,gy:713,n:'限时箱子',r:'沼泽草地',d:'限时箱子 · 限时: 15 秒 奖励: [8 x 橡胶, 4 x 废弃电子]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:364,gy:727,n:'埋藏宝藏',r:'索拉里斯星',d:'埋藏宝藏 · 掉落: [5 x 钢, 1 x 钛, 1 x 骨头]'},
  {tp:'resource',ic:'icon-lock3',cl:'#ef4444',gx:446,gy:721,n:'大师撬锁工具',r:'索拉里斯星',d:'上锁的门大师撬锁工具'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:465,gy:736,n:'普通钓点',r:'索拉里斯星',d:'钓鱼点 · 普通钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:561,gy:735,n:'豪宅入口',r:'夕阳沙漠',d:'营火豪宅入口'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:565,gy:737,n:'金钱',r:'夕阳沙漠',qid:'q_money',qt:'side',d:'支线任务金钱'},
  {tp:'resource',ic:'icon-shelter-loudspeaker',cl:'#86efac',gx:818,gy:734,n:'Shelter Sunburn-desert 扬声器',r:'夕阳沙漠',d:'避难所扬声器Shelter Sunburn-desert 扬声器'},
  {tp:'resource',ic:'icon-hatch',cl:'#a78bfa',gx:833,gy:734,n:'Shelter',r:'夕阳沙漠',d:'Shelter'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:961,gy:731,n:'古墓',r:'夕阳沙漠',d:'古墓'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:1116,gy:736,n:'许愿井',r:'蛇工',d:'许愿井'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:1460,gy:731,n:'狗屋',r:'沼泽草地',d:'狗屋'},
  {tp:'resource',ic:'icon-lock1',cl:'#fbbf24',gx:1467,gy:728,n:'基础撬锁工具',r:'沼泽草地',d:'上锁的门基础撬锁工具'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1487,gy:731,n:'吉恩斯',r:'沼泽草地',d:'营火吉恩斯'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1490,gy:736,n:'收音机',r:'沼泽草地',d:'收音机'},
  {tp:'resource',ic:'icon-arena-obelisk',cl:'#f0abfc',gx:1564,gy:740,n:'Wave 1 奖励: [12 x 铁]',r:'沼泽草地',d:'竞技场方尖碑Wave 1 奖励: [12 x 铁]Wave 2 奖励: [12 x 木料]Wave 3 奖励: [10 x 织物]Wave 4 奖励: [8 x 橡胶]Wave 5 奖励: [10 x 废弃电子]'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1671,gy:739,n:'收音机',r:'沼泽草地',d:'收音机'},
  {tp:'resource',ic:'icon-hatch',cl:'#a78bfa',gx:1696,gy:727,n:'Shelter',r:'沼泽草地',d:'Shelter'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:269,gy:750,n:'限时箱子',r:'索拉里斯星',d:'限时箱子 · 限时: 23 秒 奖励: [10 x 肉类, 1 x Scrap 织物]'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:264,gy:746,n:'狗屋',r:'索拉里斯星',d:'狗屋'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:288,gy:759,n:'收音机',r:'索拉里斯星',d:'收音机'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:325,gy:740,n:'索拉里斯星',r:'索拉里斯星',d:'链塔 · 索拉里斯星'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:395,gy:747,n:'To: Dachshund Test',r:'索拉里斯星',d:'埋藏宝藏To: Dachshund Test'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:659,gy:750,n:'优质钓点',r:'夕阳沙漠',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:812,gy:758,n:'所需材料: [4 x 稀有木材]',r:'夕阳沙漠',d:'可修复所需材料: [4 x 稀有木材]'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:899,gy:744,n:'Introductions',r:'夕阳沙漠',d:'音频日志Introductions'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:899,gy:750,n:'埋藏宝藏',r:'夕阳沙漠',d:'埋藏宝藏 · 掉落: [8 x 陶瓷, 12 x 铁, 12 x 木料]'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:930,gy:745,n:'神秘石碑s',r:'夕阳沙漠',d:'音频日志神秘石碑s'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:949,gy:744,n:'Pyramid Cyanide Gas',r:'夕阳沙漠',d:'音频日志Pyramid Cyanide Gas'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1069,gy:759,n:'藤蔓峡谷',r:'蛇工',d:'营火藤蔓峡谷'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1063,gy:756,n:'收音机',r:'蛇工',d:'收音机'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1101,gy:745,n:'埋藏宝藏',r:'蛇工',d:'埋藏宝藏 · 掉落: [2 x 钢, 6 x 橡胶]'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:1381,gy:749,n:'Dlc2 Drone To Dlc2',r:'篱笆地',d:'入口通道Dlc2 Drone To Dlc2'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1460,gy:751,n:'普通钓点',r:'沼泽草地',d:'钓鱼点 · 普通钓点'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1527,gy:751,n:'优质钓点',r:'沼泽草地',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1614,gy:744,n:'收音机',r:'沼泽草地',d:'收音机'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1602,gy:749,n:'瘟疫',r:'沼泽草地',qid:'q_plague',qt:'side',d:'主线任务瘟疫'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:1656,gy:745,n:'无情投手',r:'沼泽草地',d:'BOSS · 无情投手'},
  {tp:'resource',ic:'icon-shelter-loudspeaker',cl:'#86efac',gx:1688,gy:743,n:'Shelter 沼泽草地 扬声器',r:'沼泽草地',d:'避难所扬声器Shelter 沼泽草地 扬声器'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1710,gy:754,n:'吊桥',r:'沼泽草地',d:'吊桥'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1744,gy:750,n:'传奇钓点',r:'沼泽草地',d:'钓鱼点 · 传奇钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:191,gy:777,n:'军用机场营火',r:'索拉里斯星',d:'营火军用机场营火'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:544,gy:775,n:'优质钓点',r:'夕阳沙漠',d:'钓鱼点 · 优质钓点'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:704,gy:763,n:'狗屋',r:'夕阳沙漠',d:'狗屋'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:726,gy:769,n:'漂流木',r:'夕阳沙漠',d:'营火漂流木'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:821,gy:769,n:'限时箱子',r:'夕阳沙漠',d:'限时箱子 · 限时: 24 秒 奖励: [20 x 橡胶, 5 x 钢]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1062,gy:774,n:'埋藏宝藏',r:'蛇工',d:'埋藏宝藏 · 掉落: [8 x 铁, 4 x 兽皮, 2 x 小麦]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1068,gy:768,n:'普通钓点',r:'蛇工',d:'钓鱼点 · 普通钓点'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1148,gy:771,n:'埋藏宝藏',r:'蛇工',d:'埋藏宝藏 · 掉落: [3 x 钢, 4 x 废弃电子]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1220,gy:776,n:'普通钓点',r:'蛇工',d:'钓鱼点 · 普通钓点'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1581,gy:760,n:'吊桥',r:'沼泽草地',d:'吊桥'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1592,gy:770,n:'吊桥',r:'沼泽草地',d:'吊桥'},
  {tp:'resource',ic:'icon-unknown',cl:'#64748b',gx:1585,gy:776,n:'狗屋',r:'沼泽草地',d:'狗屋'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1603,gy:773,n:'限时箱子',r:'沼泽草地',d:'限时箱子 · 限时: 14 秒 奖励: [6 x 木料, 6 x 铁]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1617,gy:768,n:'优质钓点',r:'沼泽草地',d:'钓鱼点 · 优质钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1705,gy:778,n:'度假胜地',r:'沼泽草地',d:'营火度假胜地'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1724,gy:775,n:'收音机',r:'沼泽草地',d:'收音机'},
  {tp:'resource',ic:'icon-fuel-cell',cl:'#a78bfa',gx:309,gy:783,n:'The 王冠 of the Desert',r:'索拉里斯星',d:'燃料电池The 王冠 of the Desert'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:603,gy:793,n:'限时箱子',r:'夕阳沙漠',d:'限时箱子 · 限时: 16 秒 奖励: [1 x 蓝眼球宝珠]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:779,gy:790,n:'优质钓点',r:'夕阳沙漠',d:'钓鱼点 · 优质钓点'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:889,gy:798,n:'愚人峡谷南部',r:'夕阳沙漠',d:'营火愚人峡谷南部'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1026,gy:786,n:'所需材料: [6 x 稀有木材]',r:'蛇工',d:'可修复所需材料: [6 x 稀有木材]'},
  {tp:'resource',ic:'icon-myth-tablet',cl:'#f0abfc',gx:1198,gy:782,n:'神秘石碑',r:'蛇工',d:'神秘石碑'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:1194,gy:795,n:'神力裂隙',r:'蛇工',d:'神力裂隙'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:1187,gy:792,n:'神力裂隙',r:'蛇工',d:'神力裂隙'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1278,gy:792,n:'火山口',r:'蛇工',d:'营火火山口'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1462,gy:796,n:'限时箱子',r:'沼泽草地',d:'限时箱子 · 限时: 28 秒 奖励: [4 x 木料, 8 x 铁]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1514,gy:783,n:'限时箱子',r:'沼泽草地',d:'限时箱子 · 限时: 24 秒 奖励: [6 x 织物, 4 x 兽皮]'},
  {tp:'resource',ic:'icon-lock2',cl:'#fb923c',gx:1513,gy:796,n:'专家撬锁工具',r:'沼泽草地',d:'上锁的门专家撬锁工具'},
  {tp:'resource',ic:'icon-lock2',cl:'#fb923c',gx:1511,gy:792,n:'专家撬锁工具',r:'沼泽草地',d:'上锁的门专家撬锁工具'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:1551,gy:787,n:'沼泽草地',r:'沼泽草地',d:'链塔 · 沼泽草地'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1554,gy:790,n:'杂草丛生的仓库',r:'沼泽草地',d:'营火杂草丛生的仓库'},
  {tp:'resource',ic:'icon-fuel-cell',cl:'#a78bfa',gx:1775,gy:787,n:'The Reaper at the 度假胜地',r:'沼泽草地',d:'燃料电池The Reaper at the 度假胜地'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:139,gy:809,n:'古墓',r:'索拉里斯星',d:'古墓'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:233,gy:812,n:'水银装置营火',r:'索拉里斯星',d:'营火水银装置营火'},
  {tp:'resource',ic:'icon-fabricator',cl:'#4ade80',gx:238,gy:815,n:'Recipe: [Digital Wrist Watch]',r:'索拉里斯星',d:'加工厂Recipe: [Digital Wrist Watch]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:443,gy:813,n:'优质钓点',r:'索拉里斯星',d:'钓鱼点 · 优质钓点'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:645,gy:811,n:'蜿蜒小径',r:'夕阳沙漠',d:'古墓 · 蜿蜒小径'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:942,gy:809,n:'埋藏宝藏',r:'蛇工',d:'埋藏宝藏 · 掉落: [6 x 橡胶, 2 x 铁]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1276,gy:816,n:'火山口神殿',r:'蛇工',d:'营火火山口神殿'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1511,gy:805,n:'收音机',r:'沼泽草地',d:'收音机'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1509,gy:818,n:'普通钓点',r:'沼泽草地',d:'钓鱼点 · 普通钓点'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1589,gy:808,n:'收音机',r:'沼泽草地',d:'收音机'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:1594,gy:814,n:'可耕种地',r:'通用',d:'可耕种地'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:1598,gy:813,n:'可耕种地',r:'通用',d:'可耕种地'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:1598,gy:810,n:'可耕种地',r:'通用',d:'可耕种地'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:1598,gy:808,n:'可耕种地',r:'通用',d:'可耕种地'},
  {tp:'resource',ic:'icon-myth-tablet',cl:'#f0abfc',gx:1660,gy:802,n:'神秘石碑',r:'沼泽草地',d:'神秘石碑'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1764,gy:812,n:'收音机',r:'沼泽草地',d:'收音机'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:148,gy:826,n:'普通钓点',r:'索拉里斯星',d:'钓鱼点 · 普通钓点'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:244,gy:821,n:'取代',r:'索拉里斯星',qid:'q_displaced',qt:'key',d:'主线任务取代'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:251,gy:826,n:'神力裂隙',r:'索拉里斯星',d:'神力裂隙'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:308,gy:826,n:'军事基地南部营火',r:'索拉里斯星',d:'营火军事基地南部营火'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:370,gy:827,n:'普通钓点',r:'索拉里斯星',d:'钓鱼点 · 普通钓点'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:847,gy:820,n:'埋藏宝藏',r:'夕阳沙漠',d:'埋藏宝藏 · 掉落: [12 x 织物, 10 x 兽皮]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:952,gy:833,n:'远征基地营地',r:'蛇工',d:'营火远征基地营地'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:945,gy:824,n:'Basecamp',r:'蛇工',d:'音频日志Basecamp'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:1030,gy:826,n:'古墓',r:'蛇工',d:'古墓'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:1146,gy:839,n:'神力裂隙',r:'蛇工',d:'神力裂隙'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1169,gy:825,n:'限时箱子',r:'蛇工',d:'限时箱子 · 限时: 22 秒 奖励: [25 x 土豆, 15 x 钢, 10 x 橡胶]'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:1179,gy:833,n:'神力裂隙',r:'蛇工',d:'神力裂隙'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:1164,gy:822,n:'神力裂隙',r:'蛇工',d:'神力裂隙'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:1293,gy:826,n:'老冠军',r:'蛇工',d:'BOSS · 老冠军'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1626,gy:832,n:'吊桥',r:'沼泽草地',d:'吊桥'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1643,gy:835,n:'埋藏宝藏',r:'沼泽草地',d:'埋藏宝藏 · 掉落: [8 x 铁]'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:1684,gy:838,n:'许愿井',r:'沼泽草地',d:'许愿井'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1084,gy:842,n:'庙宇通道',r:'蛇工',d:'营火庙宇通道'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:1087,gy:843,n:'庙宇通道 Message',r:'蛇工',d:'音频日志庙宇通道 Message'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:1172,gy:848,n:'蛇工',r:'蛇工',d:'链塔 · 蛇工'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:1175,gy:858,n:'Beachhead Message',r:'蛇工',d:'音频日志Beachhead Message'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:1305,gy:852,n:'Resting Place Message',r:'蛇工',d:'音频日志Resting Place Message'},
  {tp:'resource',ic:'icon-radio',cl:'#94a3b8',gx:1573,gy:841,n:'收音机',r:'沼泽草地',d:'收音机'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:1562,gy:853,n:'To: Sphynx\'s Steps',r:'沼泽草地',d:'埋藏宝藏To: Sphynx\'s Steps'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1603,gy:855,n:'埋藏宝藏',r:'沼泽草地',d:'埋藏宝藏 · 掉落: [6 x 兽皮]'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:1020,gy:867,n:'Dig Site B',r:'蛇工',d:'音频日志Dig Site B'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:1038,gy:874,n:'To: Precision Peril',r:'蛇工',d:'埋藏宝藏To: Precision Peril'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1187,gy:868,n:'滩头车站',r:'蛇工',d:'营火滩头车站'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1203,gy:869,n:'吊桥',r:'蛇工',d:'吊桥'},
  {tp:'resource',ic:'icon-arena-obelisk',cl:'#f0abfc',gx:1254,gy:878,n:'Wave 1 奖励: [20 x 铁]',r:'蛇工',d:'竞技场方尖碑Wave 1 奖励: [20 x 铁]Wave 2 奖励: [14 x 废弃电子]Wave 3 奖励: [10 x 钢]Wave 4 奖励: [7 x 电子器件]Wave 5 奖励: [1 x 神力珠]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1272,gy:868,n:'山路入口',r:'蛇工',d:'营火山路入口'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:1275,gy:867,n:'Volcano Path Entrance Message',r:'蛇工',d:'音频日志Volcano Path Entrance Message'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1299,gy:876,n:'普通钓点',r:'蛇工',d:'钓鱼点 · 普通钓点'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1327,gy:875,n:'埋藏宝藏',r:'蛇工',d:'埋藏宝藏 · 掉落: [6 x 橡胶, 4 x 电子器件]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1342,gy:877,n:'传奇钓点',r:'蛇工',d:'钓鱼点 · 传奇钓点'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:1632,gy:866,n:'古墓',r:'沼泽草地',d:'古墓'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:1678,gy:860,n:'南端',r:'沼泽草地',d:'营火南端'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1701,gy:866,n:'传奇钓点',r:'沼泽草地',d:'钓鱼点 · 传奇钓点'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1033,gy:889,n:'埋藏宝藏',r:'蛇工',d:'埋藏宝藏 · 掉落: [8 x 陶瓷, 12 x 铁, 12 x 木料]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:1055,gy:890,n:'限时箱子',r:'蛇工',d:'限时箱子 · 限时: 25 秒 奖励: [1 x 钛]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1098,gy:899,n:'优质钓点',r:'蛇工',d:'钓鱼点 · 优质钓点'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1126,gy:890,n:'埋藏宝藏',r:'蛇工',d:'埋藏宝藏 · 掉落: [6 x 兽皮, 3 x 骨头]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1189,gy:882,n:'普通钓点',r:'蛇工',d:'钓鱼点 · 普通钓点'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:1314,gy:892,n:'所需材料: [8 x 稀有木材]',r:'蛇工',d:'可修复所需材料: [8 x 稀有木材]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:1629,gy:892,n:'优质钓点',r:'沼泽草地',d:'钓鱼点 · 优质钓点'},
  {tp:'quest',ic:'icon-quest',cl:'#ef4444',gx:898,gy:752,n:'第一次远征',r:'夕阳沙漠',qid:'q_expedition',qt:'key',d:'关键支线·898°,752°'},
  {tp:'quest',ic:'icon-quest',cl:'#ef4444',gx:659,gy:452,n:'北极快递',r:'中枢',qid:'q_polexp',qt:'key',d:'关键支线·659°,452°'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:902,gy:430,n:'国王的日志',r:'王冠',qid:'q_kingslog',qt:'side',d:'支线·902°,430°'},
  {tp:'quest',ic:'icon-quest',cl:'#ef4444',gx:1032,gy:339,n:'地下出路',r:'王冠地下',qid:'q_under',qt:'key',d:'关键支线·1032°,339°'},
  {tp:'quest',ic:'icon-quest',cl:'#ef4444',gx:196,gy:564,n:'火山踪迹',r:'瓦肯镇',qid:'q_volcanic',qt:'key',d:'关键支线·196°,564°'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:250,gy:239,n:'打开闸门',r:'冰霜号角',qid:'q_floodgates',qt:'side',d:'支线·250°,239°'},
  {tp:'quest',ic:'icon-quest',cl:'#ef4444',gx:700,gy:450,n:'神秘石碑',r:'通用',qid:'q_mythtabs',qt:'key',d:'集齐主岛10块神秘石碑'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:1372,gy:528,n:'阻止怪物重生',r:'通用',qid:'q_stop_respawn',qt:'side',d:'任意链塔触发'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:900,gy:350,n:'神秘的方尖碑',r:'通用',qid:'q_obelisks',qt:'side',d:'检查3个方尖碑'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:800,gy:550,n:'防御庇护所',r:'通用',qid:'q_shelter',qt:'side',d:'激活扬声器触发'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:242,gy:821,n:'奇异能量',r:'通用',qid:'q_strange',qt:'side',d:'接近神力裂隙触发'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:700,gy:650,n:'热带避难',r:'通用',qid:'q_sweltering',qt:'side',d:'进入热带地区触发'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:600,gy:200,n:'过冬准备',r:'通用',qid:'q_winter',qt:'side',d:'进入寒带地区触发'},
  {tp:'quest',ic:'icon-quest',cl:'#ef4444',gx:1425,gy:537,n:'埋藏宝藏任务',r:'迦百农',qid:'q_buried',qt:'side',d:'支线·1425°,537°'},
  {tp:'quest',ic:'icon-quest',cl:'#ef4444',gx:815,gy:396,n:'最终坚守',r:'中枢',qid:'q_laststand',qt:'key',d:'关键支线·装备防毒面具后触发'},
  {tp:'quest',ic:'icon-quest',cl:'#ef4444',gx:915,gy:461,n:'逃离岛屿',r:'中枢',qid:'q_escape',qt:'key',d:'主线结局·激活发射台离开岛屿'},
];;

// ════════════════════════════════════════════════
// 地下城区域数据（OGMods 官方坐标系：gx-840, gy-300 偏移）
// ════════════════════════════════════════════════
const REG_UC=[
  {cn:'地下城西入口',  color:'#86efac',gx:890, gy:372},
  {cn:'地下城东入口',  color:'#67e8f9',gx:1076,gy:372},
  {cn:'塌陷隧道',      color:'#c084fc',gx:1007,gy:349},
  {cn:'装卸区',        color:'#fbbf24',gx:1031,gy:340},
  {cn:'迷失洞窟',      color:'#a78bfa',gx:969, gy:428},
  {cn:'王冠站电梯',    color:'#f9a8d4',gx:982, gy:351},
];

// 地下城标记数据（坐标均为地下城游戏坐标，用 g2l_uc 转换）
const MD_UC=[
  {tp:'boss',    ic:'icon-boss',          cl:'#ef4444',gx:933, gy:340,n:'毒素摧毁者',       r:'地下城',qid:'q_toxic',qt:'key',d:'BOSS · The Toxic Destroyer'},
  {tp:'campfire',ic:'icon-campfire',       cl:'#ff7043',gx:1007,gy:353,n:'电梯桥营火',       r:'地下城',d:'营火 · 电梯桥营火'},
  {tp:'campfire',ic:'icon-campfire',       cl:'#ff7043',gx:930, gy:371,n:'西部隧道入口营火', r:'地下城',d:'营火 · 西部隧道入口营火'},
  {tp:'campfire',ic:'icon-campfire',       cl:'#ff7043',gx:1066,gy:370,n:'东部隧道入口营火', r:'地下城',d:'营火 · 东部隧道入口营火'},
  {tp:'campfire',ic:'icon-campfire',       cl:'#ff7043',gx:975, gy:428,n:'旧矿营火',         r:'地下城',d:'营火 · 旧矿营火'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:972, gy:367,n:'埋藏宝藏',         r:'地下城',d:'埋藏宝藏'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:1009,gy:396,n:'埋藏宝藏',         r:'地下城',d:'埋藏宝藏'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:954, gy:428,n:'埋藏宝藏',         r:'地下城',d:'埋藏宝藏 · 迷失洞窟'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:992, gy:426,n:'埋藏宝藏',         r:'地下城',d:'埋藏宝藏 · 迷失洞窟'},
  {tp:'treasure',ic:'icon-chest',          cl:'#fbbf24',gx:888, gy:386,n:'限时箱子 (15秒)',   r:'地下城',d:'限时箱子 · 限时: 15秒  奖励: [1 x 蓝眼球]'},
  {tp:'resource',ic:'icon-terminal',       cl:'#4cc9f0',gx:1010,gy:346,n:'操作终端',          r:'地下城',d:'终端 · 解锁闸门（地下出路任务）'},
  {tp:'resource',ic:'icon-entryway',       cl:'#86efac',gx:982, gy:352,n:'王冠站电梯',        r:'地下城',d:'入口 · 王冠站电梯（返回地面）'},
  {tp:'resource',ic:'icon-entryway',       cl:'#86efac',gx:890, gy:372,n:'地下城西入口',      r:'地下城',d:'入口 · 地下城西入口（王冠地区）'},
  {tp:'resource',ic:'icon-entryway',       cl:'#86efac',gx:1076,gy:372,n:'地下城东入口',      r:'地下城',d:'入口 · 地下城东入口（王冠地区）'},
  {tp:'quest',   ic:'icon-quest',          cl:'#ef4444',gx:1032,gy:339,n:'地下出路',          r:'地下城',qid:'q_under',qt:'key',d:'关键支线 · 地下出路'},
  {tp:'quest',   ic:'icon-quest',          cl:'#60a5fa',gx:890, gy:372,n:'地下城探索',        r:'地下城',qid:'q_undercrown_explore',qt:'side',d:'支线 · 地下城探索'},
];

// ── 冥界 (dlc1) ──
const MD_DLC1=[
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:454,gy:66,n:'Crystal Caves',r:'dlc1',d:'Campfire (454° ,66°) Crystal Caves'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:458,gy:69,n:'神力裂隙',r:'dlc1',d:'Rift (458° ,69°)'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:466,gy:67,n:'神力裂隙',r:'dlc1',d:'Rift (466° ,67°)'},
  {tp:'resource',ic:'icon-mana-chamber',cl:'#a78bfa',gx:478,gy:68,n:'法力室',r:'dlc1',d:'Mana Chamber (478° ,68°) Enemy Drops: [2 x Plant Matter] Random Enemy Drops: [1 x Scrap Wood, 1 x Sc'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:481,gy:65,n:'The Slick Swindler',r:'dlc1',d:'Boss (481° ,65°) The Slick Swindler'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:626,gy:78,n:'Safe Haven',r:'dlc1',d:'Campfire (626° ,78°) Safe Haven'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:633,gy:75,n:'Mana Spot',r:'dlc1',d:'Fishing Spot (633° ,75°) Mana Spot'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:366,gy:99,n:'可耕种',r:'dlc1',d:'Farmable (366° ,100°)'},
  {tp:'resource',ic:'icon-energy-relay',cl:'#67e8f9',gx:661,gy:94,n:'能量中继',r:'dlc1',d:'Energy Relay (661° ,94°)'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:368,gy:102,n:'可耕种',r:'dlc1',d:'Farmable (368° ,102°)'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:365,gy:102,n:'可耕种',r:'dlc1',d:'Farmable (366° ,102°)'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:366,gy:102,n:'Farming with Enhanced Seed Bag',r:'dlc1',qid:'q_dlc1_516186',qt:'side',d:'Side Quest (366° ,102°) Farming with Enhanced Seed Bag'},
  {tp:'resource',ic:'icon-stash',cl:'#86efac',gx:425,gy:105,n:'藏匿处',r:'dlc1',d:'Stash (425° ,105°) Stash Search Rewards: [5 x Steel, 5 x Lumber, 5 x Electronics] Stash Drops: [3 x '},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:673,gy:104,n:'可修复',r:'dlc1',d:'Drawbridge (673° ,104°)'},
  {tp:'resource',ic:'icon-mana-chamber',cl:'#a78bfa',gx:664,gy:110,n:'法力室',r:'dlc1',d:'Mana Chamber (664° ,110°) Enemy Drops: [5 x Plant Matter, 1 x Common Roach, 1 x Red Herring, 1 x Lum'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:674,gy:108,n:'Mana Spot',r:'dlc1',d:'Fishing Spot (674° ,108°) Mana Spot'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:683,gy:109,n:'Sawmill Building Basics',r:'dlc1',qid:'q_dlc1_548169',qt:'side',d:'Side Quest (684° ,109°) Sawmill Building Basics'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:384,gy:123,n:'可修复',r:'dlc1',d:'Fixable (384° ,123°) Required Materials: [3 x Lumber]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:391,gy:128,n:'Hidden Workshop',r:'dlc1',d:'Campfire (391° ,128°) Hidden Workshop'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:538,gy:120,n:'Glimpse',r:'dlc1',d:'Campfire (538° ,120°) Glimpse'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:667,gy:136,n:'Colony of the Divided',r:'dlc1',d:'Campfire (667° ,136°) Colony of the Divided'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:684,gy:137,n:'可修复',r:'dlc1',d:'Fixable (684° ,137°) Required Materials: [6 x Lumber]'},
  {tp:'resource',ic:'icon-stash',cl:'#86efac',gx:709,gy:126,n:'藏匿处',r:'dlc1',d:'Stash (709° ,126°) Stash Search Rewards: [5 x Lumber, 5 x Rubber, 5 x Plastics] Stash Drops: [1 x Sc'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:746,gy:137,n:'埋藏宝藏',r:'dlc1',d:'Buried Treasure (746° ,137°) Drops: [10 x Bone, 10 x Meat]'},
  {tp:'resource',ic:'icon-stash',cl:'#86efac',gx:764,gy:126,n:'藏匿处',r:'dlc1',d:'Stash (764° ,126°) Stash Search Rewards: [6 x Electronics, 8 x Steel] Stash Drops: [1 x Blue Eye Orb'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:424,gy:148,n:'许愿井',r:'dlc1',d:'Wishing Well (424° ,148°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:483,gy:142,n:'Mana Spot',r:'dlc1',d:'Fishing Spot (483° ,142°) Mana Spot'},
  {tp:'resource',ic:'icon-stash',cl:'#86efac',gx:582,gy:159,n:'藏匿处',r:'dlc1',d:'Stash (582° ,159°) Stash Search Rewards: [5 x Steel, 5 x Lumber] Stash Drops: [3 x Scrap Wood]'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:676,gy:142,n:'Underworld Fate',r:'dlc1',d:'Audio Log (676° ,142°) Underworld Fate'},
  {tp:'resource',ic:'icon-arena-obelisk',cl:'#f0abfc',gx:750,gy:157,n:'竞技场方尖碑',r:'dlc1',d:'Arena Obelisk (750° ,157°) Wave 1 Rewards: [18 x Wood] Wave 2 Rewards: [10 x Rubber] Wave 3 Rewards:'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:794,gy:157,n:'Scavenger Hamlet',r:'dlc1',d:'Campfire (794° ,157°) Scavenger Hamlet'},
  {tp:'resource',ic:'icon-stash',cl:'#86efac',gx:522,gy:162,n:'藏匿处',r:'dlc1',d:'Stash (522° ,162°) Stash Search Rewards: [5 x Steel, 5 x Lumber] Stash Drops: [3 x Scrap Wood]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:532,gy:175,n:'埋藏宝藏',r:'dlc1',d:'Buried Treasure (532° ,175°) Drops: [5 x Red Mushroom, 5 x Electronics, 2 x Lumber]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:736,gy:162,n:'Mana Spot',r:'dlc1',d:'Fishing Spot (736° ,162°) Mana Spot'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:765,gy:179,n:'Legendary Mana Spot',r:'dlc1',d:'Fishing Spot (765° ,179°) Legendary Mana Spot'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:793,gy:165,n:'Vault into Past',r:'dlc1',qid:'q_dlc1_846171',qt:'side',d:'Side Quest (793° ,165°) Vault into Past'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:814,gy:162,n:'Mana Spot',r:'dlc1',d:'Fishing Spot (814° ,162°) Mana Spot'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:470,gy:184,n:'埋藏宝藏',r:'dlc1',d:'Buried Treasure (470° ,184°) Drops: [15 x Rubber, 5 x Electronics]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:650,gy:186,n:'埋藏宝藏',r:'dlc1',d:'Buried Treasure (650° ,186°) Drops: [2 x Steel, 10 x Fabric]'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:658,gy:193,n:'传送宝藏',r:'dlc1',d:'Buried Treasure (658° ,193°) To: Blade Runner\'s Maze'},
  {tp:'resource',ic:'icon-unknown',cl:'#94a3b8',gx:773,gy:194,n:'',r:'dlc1',d:'Doghouse (773° ,194°)'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:376,gy:208,n:'埋藏宝藏',r:'dlc1',d:'Buried Treasure (376° ,208°) Drops: [1 x Mana Shard, 5 x Fabric]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:396,gy:208,n:'Good Spot',r:'dlc1',d:'Fishing Spot (396° ,208°) Good Spot'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:572,gy:207,n:'Underworld Rumors',r:'dlc1',d:'Audio Log (572° ,207°) Underworld Rumors'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:606,gy:217,n:'Underworld Doc',r:'dlc1',d:'Audio Log (606° ,217°) Underworld Doc'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:634,gy:212,n:'可修复',r:'dlc1',d:'Fixable (634° ,212°) Required Materials: [4 x Lumber]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:623,gy:215,n:'Broken Railroad',r:'dlc1',d:'Campfire (623° ,215°) Broken Railroad'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:656,gy:206,n:'可修复',r:'dlc1',d:'Drawbridge (656° ,206°)'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:665,gy:215,n:'埋藏宝藏',r:'dlc1',d:'Buried Treasure (665° ,215°) Drops: [3 x Steel, 5 x Rubber]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:725,gy:219,n:'限时箱子',r:'dlc1',d:'Timed Chest (725° ,219°) Time Available: 18 seconds Rewards: [1 x Mana Chunk, 2 x Titanium]'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:754,gy:218,n:'许愿井',r:'dlc1',d:'Wishing Well (754° ,218°)'},
  {tp:'resource',ic:'icon-hatch',cl:'#94a3b8',gx:797,gy:213,n:'避难所',r:'dlc1',d:'Shelter (797° ,213°)'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:788,gy:215,n:'限时箱子',r:'dlc1',d:'Timed Chest (788° ,215°) Time Available: 27 seconds Rewards: [6 x Lumber, 10 x Steel, 1 x Mana Chunk'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:807,gy:216,n:'埋藏宝藏',r:'dlc1',d:'Buried Treasure (807° ,216°) Drops: [4 x Steel, 12 x Rubber, 25 x Ceramics]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:842,gy:215,n:'埋藏宝藏',r:'dlc1',d:'Buried Treasure (842° ,215°) Drops: [5 x Mana Bead, 2 x Titanium]'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:396,gy:235,n:'传送宝藏',r:'dlc1',d:'Buried Treasure (396° ,235°) To: The Perilous Labyrinth'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:464,gy:236,n:'Good Spot',r:'dlc1',d:'Fishing Spot (464° ,236°) Good Spot'},
  {tp:'resource',ic:'icon-mana-chamber',cl:'#a78bfa',gx:508,gy:228,n:'法力室',r:'dlc1',d:'Mana Chamber (508° ,228°) Enemy Drops: [1 x Fabric, 2 x Wood, 1 x Wood, 1 x Scrap Fabric, 2 x Iron, '},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:610,gy:223,n:'神力裂隙',r:'dlc1',d:'Rift (610° ,223°)'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:640,gy:226,n:'Sawmill Building Basics',r:'dlc1',qid:'q_dlc1_1118254',qt:'side',d:'Side Quest (640° ,226°) Sawmill Building Basics'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:648,gy:228,n:'可耕种',r:'dlc1',d:'Farmable (648° ,228°)'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:650,gy:230,n:'可耕种',r:'dlc1',d:'Farmable (650° ,230°)'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:644,gy:230,n:'可耕种',r:'dlc1',d:'Farmable (644° ,230°)'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:729,gy:223,n:'神力裂隙',r:'dlc1',d:'Rift (729° ,223°)'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:774,gy:235,n:'神力裂隙',r:'dlc1',d:'Rift (774° ,235°)'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:99,gy:251,n:'Underworld Island Entrance',r:'dlc1',d:'Entryway (99° ,251°) Underworld Island Entrance'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:112,gy:240,n:'Island In the End',r:'dlc1',d:'Campfire (112° ,240°) Island In the End'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:357,gy:256,n:'Beachtop',r:'dlc1',d:'Campfire (357° ,256°) Beachtop'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:376,gy:252,n:'Mana Spot',r:'dlc1',d:'Fishing Spot (376° ,252°) Mana Spot'},
  {tp:'resource',ic:'icon-mana-chamber',cl:'#a78bfa',gx:414,gy:251,n:'法力室',r:'dlc1',d:'Mana Chamber (414° ,251°) Enemy Drops: [2 x Rubber, 4 x Iron, 2 x Lumber, 1 x Scrap Fabric, 1 x Plas'},
  {tp:'resource',ic:'icon-stash',cl:'#86efac',gx:433,gy:255,n:'藏匿处',r:'dlc1',d:'Stash (433° ,255°) Stash Search Rewards: [5 x Steel, 10 x Rubber] Stash Drops: [3 x Scrap Wood]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:449,gy:241,n:'Jalopy Station',r:'dlc1',d:'Campfire (449° ,241°) Jalopy Station'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:501,gy:258,n:'Overrun Barricades',r:'dlc1',d:'Campfire (501° ,258°) Overrun Barricades'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:538,gy:248,n:'可修复',r:'dlc1',d:'Drawbridge (538° ,248°)'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:573,gy:248,n:'可修复',r:'dlc1',d:'Drawbridge (573° ,248°)'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:608,gy:251,n:'Capper',r:'dlc1',d:'Link Tower (608° ,251°) Capper'},
  {tp:'resource',ic:'icon-energy-relay',cl:'#67e8f9',gx:612,gy:255,n:'能量中继',r:'dlc1',d:'Energy Relay (612° ,255°)'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:736,gy:252,n:'Basin of Solitude',r:'dlc1',d:'Campfire (736° ,252°) Basin of Solitude'},
  {tp:'resource',ic:'icon-stash',cl:'#86efac',gx:777,gy:250,n:'藏匿处',r:'dlc1',d:'Stash (777° ,250°) Stash Search Rewards: [10 x Steel, 8 x Electronics, 2 x Titanium] Stash Drops: [1'},
  {tp:'resource',ic:'icon-mana-chamber',cl:'#a78bfa',gx:836,gy:257,n:'法力室',r:'dlc1',d:'Mana Chamber (836° ,257°) Enemy Drops: [1 x Lobster, 1 x Lobster, 1 x Lumber, 2 x Wood, 1 x Mana Bea'},
  {tp:'resource',ic:'icon-energy-relay',cl:'#67e8f9',gx:885,gy:242,n:'能量中继',r:'dlc1',d:'Energy Relay (885° ,242°)'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:414,gy:264,n:'可修复',r:'dlc1',d:'Drawbridge (414° ,264°)'},
  {tp:'resource',ic:'icon-energy-relay',cl:'#67e8f9',gx:449,gy:270,n:'能量中继',r:'dlc1',d:'Energy Relay (449° ,270°)'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:558,gy:280,n:'Crownsville',r:'dlc1',d:'Campfire (558° ,280°) Crownsville'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:614,gy:262,n:'Ivory Mountain Co.',r:'dlc1',d:'Campfire (614° ,262°) Ivory Mountain Co.'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:688,gy:270,n:'Dexter',r:'dlc1',d:'Link Tower (688° ,270°) Dexter'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:725,gy:271,n:'神力裂隙',r:'dlc1',d:'Rift (725° ,271°)'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:761,gy:260,n:'神力裂隙',r:'dlc1',d:'Rift (761° ,260°)'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:798,gy:276,n:'埋藏宝藏',r:'dlc1',d:'Buried Treasure (798° ,276°) Drops: [1 x Mana Shard, 12 x Lumber]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:851,gy:279,n:'Farm of Desolation',r:'dlc1',d:'Campfire (851° ,279°) Farm of Desolation'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:398,gy:286,n:'可修复',r:'dlc1',d:'Drawbridge (398° ,286°)'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:384,gy:281,n:'Knot Shores',r:'dlc1',d:'Campfire (384° ,281°) Knot Shores'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:426,gy:287,n:'埋藏宝藏',r:'dlc1',d:'Buried Treasure (426° ,287°) Drops: [8 x Iron, 8 x Rubber, 1 x Mana Bead]'},
  {tp:'resource',ic:'icon-mana-chamber',cl:'#a78bfa',gx:494,gy:298,n:'法力室',r:'dlc1',d:'Mana Chamber (494° ,298°) Enemy Drops: [2 x Rubber, 2 x Iron, 1 x Fabric, 1 x Lobster, 1 x Steel, 3 '},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:521,gy:292,n:'可修复',r:'dlc1',d:'Drawbridge (521° ,292°)'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:540,gy:283,n:'Underworld Divide',r:'dlc1',d:'Audio Log (540° ,283°) Underworld Divide'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:586,gy:290,n:'Underworld Ivory',r:'dlc1',d:'Audio Log (586° ,290°) Underworld Ivory'},
  {tp:'resource',ic:'icon-stash',cl:'#86efac',gx:661,gy:285,n:'藏匿处',r:'dlc1',d:'Stash (661° ,285°) Stash Search Rewards: [5 x Carrot, 5 x Corn, 5 x Tomato, 5 x Berries, 1 x Lobster'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:748,gy:296,n:'神力裂隙',r:'dlc1',d:'Rift (748° ,296°)'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:772,gy:283,n:'神力裂隙',r:'dlc1',d:'Rift (772° ,283°)'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:828,gy:286,n:'可修复',r:'dlc1',d:'Drawbridge (828° ,286°)'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:855,gy:291,n:'可耕种',r:'dlc1',d:'Farmable (856° ,292°)'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:856,gy:294,n:'可耕种',r:'dlc1',d:'Farmable (856° ,294°)'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:858,gy:290,n:'可耕种',r:'dlc1',d:'Farmable (858° ,290°)'},
  {tp:'resource',ic:'icon-stash',cl:'#86efac',gx:424,gy:314,n:'藏匿处',r:'dlc1',d:'Stash (424° ,314°) Stash Search Rewards: [1 x Blue Eye Orb] Stash Drops: [1 x Blue Eye Orb]'},
  {tp:'resource',ic:'icon-energy-relay',cl:'#67e8f9',gx:554,gy:315,n:'能量中继',r:'dlc1',d:'Energy Relay (554° ,315°)'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:556,gy:300,n:'可修复',r:'dlc1',d:'Drawbridge (556° ,300°)'},
  {tp:'resource',ic:'icon-lock',cl:'#4ade80',gx:625,gy:305,n:'',r:'dlc1',d:'Locked Door (625° ,305°) Doc\'s House Key'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:624,gy:316,n:'可耕种',r:'dlc1',d:'Farmable (624° ,316°)'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:625,gy:316,n:'可耕种',r:'dlc1',d:'Farmable (626° ,316°)'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:624,gy:314,n:'可耕种',r:'dlc1',d:'Farmable (624° ,314°)'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:620,gy:311,n:'Farming with Enhanced Seed Bag',r:'dlc1',qid:'q_dlc1_1502119',qt:'side',d:'Side Quest (620° ,312°) Farming with Enhanced Seed Bag'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:640,gy:313,n:'限时箱子',r:'dlc1',d:'Timed Chest (640° ,313°) Time Available: 30 seconds Rewards: [1 x Blue Eye Orb, 1 x Titanium]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:665,gy:306,n:'Gorge of the Undead',r:'dlc1',d:'Campfire (665° ,306°) Gorge of the Undead'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:721,gy:312,n:'埋藏宝藏',r:'dlc1',d:'Buried Treasure (721° ,312°)'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:782,gy:310,n:'神力裂隙',r:'dlc1',d:'Rift (782° ,310°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:782,gy:312,n:'Legendary Mana Spot',r:'dlc1',d:'Fishing Spot (782° ,312°) Legendary Mana Spot'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:813,gy:313,n:'Mana Spot',r:'dlc1',d:'Fishing Spot (814° ,313°) Mana Spot'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:801,gy:318,n:'限时箱子',r:'dlc1',d:'Timed Chest (801° ,318°) Time Available: 29 seconds Rewards: [2 x Titanium, 10 x Lumber]'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:487,gy:334,n:'Desperate Existence',r:'dlc1',qid:'q_dlc1_1584342',qt:'side',d:'Side Quest (487° ,334°) Desperate Existence'},
  {tp:'resource',ic:'icon-lock',cl:'#4ade80',gx:549,gy:321,n:'',r:'dlc1',d:'Locked Door (549° ,321°) Town Station Key'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:576,gy:338,n:'可修复',r:'dlc1',d:'Drawbridge (576° ,338°)'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:564,gy:327,n:'Underworld Relays',r:'dlc1',d:'Audio Log (564° ,327°) Underworld Relays'},
  {tp:'resource',ic:'icon-unknown',cl:'#94a3b8',gx:590,gy:325,n:'',r:'dlc1',d:'Doghouse (590° ,325°)'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:642,gy:334,n:'传送宝藏',r:'dlc1',d:'Buried Treasure (642° ,334°) To: The Abandoned Maze'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:723,gy:339,n:'Underworld Spirits',r:'dlc1',d:'Audio Log (723° ,339°) Underworld Spirits'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:739,gy:328,n:'埋藏宝藏',r:'dlc1',d:'Buried Treasure (739° ,328°) Drops: [1 x Mana Shard, 4 x Titanium, 30 x Plastics]'},
  {tp:'resource',ic:'icon-stash',cl:'#86efac',gx:768,gy:329,n:'藏匿处',r:'dlc1',d:'Stash (768° ,329°) Stash Search Rewards: [5 x Steel, 5 x Mana Bead, 2 x Mana Chunk] Stash Drops: [1 '},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:771,gy:339,n:'神力裂隙',r:'dlc1',d:'Rift (771° ,339°)'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:799,gy:330,n:'神力裂隙',r:'dlc1',d:'Rift (799° ,330°)'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:420,gy:356,n:'埋藏宝藏',r:'dlc1',d:'Buried Treasure (420° ,356°) Drops: [5 x Hide, 5 x Fabric]'},
  {tp:'resource',ic:'icon-energy-relay',cl:'#67e8f9',gx:451,gy:356,n:'能量中继',r:'dlc1',d:'Energy Relay (451° ,356°)'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:480,gy:346,n:'Passage Valley',r:'dlc1',d:'Campfire (480° ,346°) Passage Valley'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:526,gy:358,n:'Smelter Building Basics',r:'dlc1',qid:'q_dlc1_1684049',qt:'side',d:'Side Quest (526° ,358°) Smelter Building Basics'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:542,gy:343,n:'可修复',r:'dlc1',d:'Fixable (542° ,343°) Required Materials: [3 x Lumber]'},
  {tp:'resource',ic:'icon-mana-chamber',cl:'#a78bfa',gx:697,gy:347,n:'法力室',r:'dlc1',d:'Mana Chamber (697° ,347°) Enemy Drops: [1 x Blue Eye Orb] Random Enemy Drops: [1 x Blue Eye Orb]'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:696,gy:345,n:'Spirit Trouble',r:'dlc1',qid:'q_dlc1_1700229',qt:'key',d:'Main Quest (696° ,345°) Spirit Trouble'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:449,gy:366,n:'Sinister',r:'dlc1',d:'Link Tower (449° ,366°) Sinister'},
  {tp:'resource',ic:'icon-stash',cl:'#86efac',gx:631,gy:368,n:'藏匿处',r:'dlc1',d:'Stash (631° ,368°) Stash Search Rewards: [10 x Egg, 5 x Wheat, 5 x Tomato, 2 x Spices] Stash Drops: '},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:730,gy:362,n:'Shattered Suburbs',r:'dlc1',d:'Campfire (730° ,362°) Shattered Suburbs'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:758,gy:374,n:'神力裂隙',r:'dlc1',d:'Rift (758° ,374°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:788,gy:362,n:'Mana Spot',r:'dlc1',d:'Fishing Spot (788° ,362°) Mana Spot'},
  {tp:'resource',ic:'icon-stash',cl:'#86efac',gx:468,gy:400,n:'藏匿处',r:'dlc1',d:'Stash (468° ,400°) Stash Search Rewards: [5 x Potato, 3 x Hide, 5 x Fabric, 2 x Steel] Stash Drops: '},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:509,gy:382,n:'Mana Spot',r:'dlc1',d:'Fishing Spot (509° ,382°) Mana Spot'},
  {tp:'resource',ic:'icon-arena-obelisk',cl:'#f0abfc',gx:530,gy:384,n:'竞技场方尖碑',r:'dlc1',d:'Arena Obelisk (530° ,384°) Wave 1 Rewards: [18 x Wood] Wave 2 Rewards: [10 x Rubber] Wave 3 Rewards:'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:582,gy:384,n:'Scarp of Thieves',r:'dlc1',d:'Campfire (582° ,384°) Scarp of Thieves'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:427,gy:414,n:'Underworld Entryway',r:'dlc1',d:'Campfire (427° ,414°) Underworld Entryway'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:435,gy:411,n:'Underworld Explorers',r:'dlc1',d:'Audio Log (435° ,411°) Underworld Explorers'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:506,gy:410,n:'埋藏宝藏',r:'dlc1',d:'Buried Treasure (506° ,410°)'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:553,gy:407,n:'埋藏宝藏',r:'dlc1',d:'Buried Treasure (553° ,407°)'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:564,gy:413,n:'埋藏宝藏',r:'dlc1',d:'Buried Treasure (564° ,413°) Required Quest: Desperate Existence [Side Quest] Drops: [1 x Scrap Fabr'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:402,gy:423,n:'Entrance Underworld',r:'dlc1',d:'Entryway (402° ,423°) Entrance Underworld'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:448,gy:437,n:'埋藏宝藏',r:'dlc1',d:'Buried Treasure (448° ,437°) Drops: [5 x Hide, 5 x Rubber]'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:516,gy:433,n:'传送宝藏',r:'dlc1',d:'Buried Treasure (516° ,433°)'},
  {tp:'resource',ic:'icon-mana-chamber',cl:'#a78bfa',gx:552,gy:426,n:'法力室',r:'dlc1',d:'Mana Chamber (552° ,426°) Enemy Drops: [1 x Blue Eye Orb] Random Enemy Drops: [1 x Blue Eye Orb]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:516,gy:443,n:'Mana Spot',r:'dlc1',d:'Fishing Spot (516° ,443°) Mana Spot'},
];

const REG_DLC1=[
  {cn:'Jalopy Station',color:'#fbbf24',gx:449,gy:265},
  {cn:'Bunker Station',color:'#fbbf24',gx:875,gy:243},
  {cn:'Colony Station',color:'#fbbf24',gx:659,gy:91},
  {cn:'Arrowhead Station',color:'#fbbf24',gx:455,gy:352},
  {cn:'Southern Crownsville',color:'#fbbf24',gx:567,gy:274},
  {cn:'Northern Crownsville',color:'#fbbf24',gx:579,gy:211},
  {cn:'Eastern Farmlands',color:'#86efac',gx:645,gy:244},
  {cn:'Colony of the Divided',color:'#fbbf24',gx:673,gy:126},
  {cn:'Foundry Point',color:'#86efac',gx:529,gy:352},
  {cn:'Crystal Caves',color:'#fbbf24',gx:444,gy:87},
  {cn:'Ivory Mountain Co.',color:'#86efac',gx:606,gy:247},
  {cn:'Town Station',color:'#fbbf24',gx:554,gy:321},
  {cn:'Doc\'s House',color:'#86efac',gx:619,gy:307},
  {cn:'Shattered Suburbs',color:'#86efac',gx:700,gy:353},
  {cn:'Lost Forest',color:'#86efac',gx:517,gy:438},
  {cn:'Apex Gasoline',color:'#86efac',gx:425,gy:272},
  {cn:'Basin of Solitude',color:'#fbbf24',gx:736,gy:254},
  {cn:'Cavern of Wishes',color:'#86efac',gx:440,gy:156},
  {cn:'Farm of Desolation',color:'#86efac',gx:851,gy:290},
  {cn:'Safe Haven',color:'#86efac',gx:626,gy:80},
  {cn:'Underworld Entryway',color:'#fbbf24',gx:421,gy:425},
  {cn:'Passage Valley',color:'#86efac',gx:493,gy:320},
  {cn:'Derelict Outpost',color:'#86efac',gx:665,gy:176},
  {cn:'Hidden Workshop',color:'#86efac',gx:350,gy:108},
  {cn:'Island in the End',color:'#fbbf24',gx:109,gy:250},
  {cn:'Gorge of the Undead',color:'#86efac',gx:625,gy:338},
  {cn:'Mortal Roundabout',color:'#86efac',gx:474,gy:274},
  {cn:'Scavenger Hamlet',color:'#86efac',gx:792,gy:155},
  {cn:'Scarp of Thieves',color:'#86efac',gx:555,gy:404},
  {cn:'Plateau of Respite',color:'#86efac',gx:746,gy:333},
  {cn:'Cliffside Encampment',color:'#86efac',gx:803,gy:295},
  {cn:'Farm from Afar',color:'#86efac',gx:748,gy:223},
];

// ── 末日 (dlc2) ──
const MD_DLC2=[
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:194,gy:49,n:'Doomsday\'s Common Spot',r:'dlc2',d:'Fishing Spot (194° ,49°) Doomsday\'s Common Spot'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:315,gy:57,n:'Doomsday\'s Good Spot',r:'dlc2',d:'Fishing Spot (315° ,57°) Doomsday\'s Good Spot'},
  {tp:'resource',ic:'icon-hatch',cl:'#94a3b8',gx:211,gy:74,n:'避难所',r:'dlc2',d:'Shelter (211° ,74°)'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:461,gy:79,n:'终端',r:'dlc2',d:'Terminal (462° ,79°)'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:189,gy:97,n:'The Concrete Forest',r:'dlc2',d:'Campfire (189° ,97°) The Concrete Forest'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:217,gy:99,n:'Dlc2 Introduction',r:'dlc2',d:'Audio Log (217° ,99°) Dlc2 Introduction'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:307,gy:85,n:'限时箱子',r:'dlc2',d:'Timed Chest (307° ,85°) Time Available: 15 seconds Rewards: [1 x Blue Eye Orb]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:343,gy:89,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (343° ,89°) Drops: [2 x Lumber, 2 x Steel]'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:376,gy:88,n:'可修复',r:'dlc2',d:'Drawbridge (376° ,88°)'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:479,gy:95,n:'Coastlab Interior',r:'dlc2',d:'Campfire (479° ,95°) Coastlab Interior'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:542,gy:99,n:'Doomsday\'s Legendary Spot',r:'dlc2',d:'Fishing Spot (542° ,99°) Doomsday\'s Legendary Spot'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:244,gy:100,n:'Nona Complex Interior Entrance',r:'dlc2',d:'Campfire (244° ,100°) Nona Complex Interior Entrance'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:330,gy:110,n:'Logistics Area',r:'dlc2',d:'Campfire (330° ,110°) Logistics Area'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:333,gy:109,n:'Dlc2 Success',r:'dlc2',d:'Audio Log (333° ,109°) Dlc2 Success'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:344,gy:110,n:'限时箱子',r:'dlc2',d:'Timed Chest (344° ,110°) Time Available: 11 seconds Rewards: [8 x Electronics, 6 x Gold Ore]'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:476,gy:102,n:'Coastlab Entrance Terminal',r:'dlc2',d:'Terminal (476° ,102°) Coastlab Entrance Terminal'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:196,gy:133,n:'限时箱子',r:'dlc2',d:'Timed Chest (196° ,133°) Time Available: 15 seconds Rewards: [1 x Blue Eye Orb]'},
  {tp:'resource',ic:'icon-fabricator',cl:'#4ade80',gx:208,gy:122,n:'Recipe: [Beam Gun]',r:'dlc2',d:'Fabricator (208° ,122°) Recipe: [Beam Gun]'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:276,gy:136,n:'Nona Defensive System Test Range Terminal',r:'dlc2',d:'Terminal (276° ,136°) Nona Defensive System Test Range Terminal'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:271,gy:123,n:'Computer Assisted Targeting System',r:'dlc2',d:'Boss (271° ,123°) Computer Assisted Targeting System'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:444,gy:128,n:'Go With the Flow',r:'dlc2',qid:'q_dlc2_620311',qt:'side',d:'Side Quest (444° ,128°) Go With the Flow'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:484,gy:126,n:'Good Spot',r:'dlc2',d:'Fishing Spot (484° ,126°) Good Spot'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:806,gy:139,n:'神力裂隙',r:'dlc2',d:'Rift (806° ,139°)'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:116,gy:151,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (116° ,151°) Drops: [1 x Banana, 15 x Mana Bead, 8 x Ceramics]'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:242,gy:144,n:'终端',r:'dlc2',d:'Terminal (242° ,144°)'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:276,gy:159,n:'Nona',r:'dlc2',d:'Link Tower (276° ,159°) Nona'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:290,gy:142,n:'Logistics Entrance',r:'dlc2',d:'Campfire (290° ,142°) Logistics Entrance'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:310,gy:145,n:'Sawmill Building Basics',r:'dlc2',qid:'q_dlc2_702294',qt:'side',d:'Side Quest (310° ,145°) Sawmill Building Basics'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:397,gy:144,n:'Doomsday\'s Legendary Spot',r:'dlc2',d:'Fishing Spot (397° ,144°) Doomsday\'s Legendary Spot'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:491,gy:143,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (491° ,143°) Drops: [1 x Electronics]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:505,gy:155,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (505° ,155°) Drops: [1 x Steel]'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:508,gy:143,n:'可修复',r:'dlc2',d:'Drawbridge (508° ,143°)'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:513,gy:150,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (513° ,150°) Drops: [1 x Scrap Fabric]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:539,gy:146,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (539° ,146°)'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:524,gy:147,n:'Scrapyard Entrance Terminal',r:'dlc2',d:'Terminal (524° ,147°) Scrapyard Entrance Terminal'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:537,gy:152,n:'Scrapyard Entrance',r:'dlc2',d:'Campfire (537° ,152°) Scrapyard Entrance'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:547,gy:146,n:'Doomsday\'s Good Spot',r:'dlc2',d:'Fishing Spot (547° ,146°) Doomsday\'s Good Spot'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:639,gy:144,n:'Morta Aerial Resupply Depot',r:'dlc2',d:'Campfire (639° ,144°) Morta Aerial Resupply Depot'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:667,gy:151,n:'Doomsday\'s Legendary Spot',r:'dlc2',d:'Fishing Spot (667° ,151°) Doomsday\'s Legendary Spot'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:681,gy:157,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (681° ,157°)'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:781,gy:156,n:'限时箱子',r:'dlc2',d:'Timed Chest (781° ,156°) Time Available: 15 seconds Rewards: [1 x Blue Eye Orb]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:840,gy:151,n:'Doomsday\'s Legendary Spot',r:'dlc2',d:'Fishing Spot (840° ,151°) Doomsday\'s Legendary Spot'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:128,gy:164,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (128° ,164°) Drops: [4 x Wood, 6 x Rubber, 1 x Truffle]'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:143,gy:172,n:'Turn Over A New Leaf',r:'dlc2',qid:'q_dlc2_782322',qt:'side',d:'Side Quest (143° ,172°) Turn Over A New Leaf'},
  {tp:'resource',ic:'icon-unknown',cl:'#94a3b8',gx:144,gy:166,n:'',r:'dlc2',d:'Doghouse (144° ,166°)'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:152,gy:171,n:'Collingwood',r:'dlc2',d:'Campfire (152° ,171°) Collingwood'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:268,gy:162,n:'Smelter Building Basics',r:'dlc2',qid:'q_dlc2_794240',qt:'side',d:'Side Quest (268° ,162°) Smelter Building Basics'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:298,gy:161,n:'终端',r:'dlc2',d:'Terminal (298° ,162°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:302,gy:168,n:'Doomsday\'s Legendary Spot',r:'dlc2',d:'Fishing Spot (302° ,168°) Doomsday\'s Legendary Spot'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:331,gy:161,n:'Doomsday\'s Good Spot',r:'dlc2',d:'Fishing Spot (331° ,161°) Doomsday\'s Good Spot'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:426,gy:166,n:'Doomsday\'s Good Spot',r:'dlc2',d:'Fishing Spot (426° ,166°) Doomsday\'s Good Spot'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:479,gy:166,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (479° ,166°) Required Quest: On to the Scrap Heap [Side Quest] Key Drops: [Scrapyard'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:477,gy:171,n:'Doomsday\'s Good Spot',r:'dlc2',d:'Fishing Spot (477° ,171°) Doomsday\'s Good Spot'},
  {tp:'resource',ic:'icon-unknown',cl:'#94a3b8',gx:478,gy:168,n:'',r:'dlc2',d:'Doghouse (478° ,168°)'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:678,gy:173,n:'Dlc2 Abyss',r:'dlc2',d:'Audio Log (678° ,173°) Dlc2 Abyss'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:117,gy:181,n:'Doomsday\'s Good Spot',r:'dlc2',d:'Fishing Spot (117° ,181°) Doomsday\'s Good Spot'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:160,gy:195,n:'限时箱子',r:'dlc2',d:'Timed Chest (160° ,195°) Time Available: 15 seconds Rewards: [1 x Blue Eye Orb]'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:162,gy:185,n:'神力裂隙',r:'dlc2',d:'Rift (162° ,185°)'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:231,gy:197,n:'Nona Complex Exterior Base',r:'dlc2',d:'Campfire (231° ,197°) Nona Complex Exterior Base'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:300,gy:191,n:'Attica',r:'dlc2',d:'Campfire (300° ,191°) Attica'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:312,gy:196,n:'Strike the Earth',r:'dlc2',qid:'q_dlc2_894108',qt:'side',d:'Side Quest (312° ,196°) Strike the Earth'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:445,gy:183,n:'North of Decima Complex',r:'dlc2',d:'Campfire (445° ,183°) North of Decima Complex'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:539,gy:193,n:'Doomsday\'s Good Spot',r:'dlc2',d:'Fishing Spot (539° ,193°) Doomsday\'s Good Spot'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:554,gy:182,n:'On to the Scrap Heap',r:'dlc2',qid:'q_dlc2_918129',qt:'side',d:'Side Quest (554° ,182°) On to the Scrap Heap'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:583,gy:187,n:'Doomsday\'s Good Spot',r:'dlc2',d:'Fishing Spot (583° ,187°) Doomsday\'s Good Spot'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:617,gy:185,n:'The Legend of the Magic Sword',r:'dlc2',qid:'q_dlc2_924244',qt:'side',d:'Side Quest (617° ,185°) The Legend of the Magic Sword'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:708,gy:184,n:'Morta Complex Parking Area',r:'dlc2',d:'Campfire (708° ,184°) Morta Complex Parking Area'},
  {tp:'resource',ic:'icon-hatch',cl:'#94a3b8',gx:758,gy:186,n:'避难所',r:'dlc2',d:'Shelter (758° ,186°)'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:798,gy:186,n:'Temporal Laboratory Entrance',r:'dlc2',d:'Campfire (798° ,186°) Temporal Laboratory Entrance'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:784,gy:191,n:'可修复',r:'dlc2',d:'Drawbridge (784° ,192°)'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:813,gy:182,n:'神力裂隙',r:'dlc2',d:'Rift (813° ,182°)'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:190,gy:218,n:'可修复',r:'dlc2',d:'Drawbridge (190° ,218°)'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:217,gy:219,n:'传送宝藏',r:'dlc2',d:'Buried Treasure (217° ,219°)'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:251,gy:202,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (251° ,202°) Drops: [4 x Gold Bar]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:339,gy:201,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (339° ,201°) Drops: [6 x Scrap Electronics, 4 x Wood]'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:376,gy:200,n:'可修复',r:'dlc2',d:'Drawbridge (376° ,200°)'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:500,gy:214,n:'Personnel Dormitory',r:'dlc2',d:'Campfire (500° ,214°) Personnel Dormitory'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:536,gy:215,n:'限时箱子',r:'dlc2',d:'Timed Chest (536° ,215°) Time Available: 15 seconds Rewards: [1 x Blue Eye Orb]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:570,gy:219,n:'Outside Live Specimen Study',r:'dlc2',d:'Campfire (570° ,219°) Outside Live Specimen Study'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:673,gy:205,n:'Doomsday\'s Good Spot',r:'dlc2',d:'Fishing Spot (673° ,205°) Doomsday\'s Good Spot'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:673,gy:213,n:'神力裂隙',r:'dlc2',d:'Rift (673° ,213°)'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:671,gy:217,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (671° ,217°) Drops: [8 x Gold Bar]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:752,gy:211,n:'Outside Morta Main Generator',r:'dlc2',d:'Campfire (752° ,211°) Outside Morta Main Generator'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:756,gy:215,n:'终端',r:'dlc2',d:'Terminal (756° ,215°)'},
  {tp:'resource',ic:'icon-unknown',cl:'#94a3b8',gx:785,gy:216,n:'',r:'dlc2',d:'Doghouse (785° ,216°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:807,gy:208,n:'Doomsday\'s Good Spot',r:'dlc2',d:'Fishing Spot (807° ,208°) Doomsday\'s Good Spot'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:835,gy:204,n:'Doomsday\'s Legendary Spot',r:'dlc2',d:'Fishing Spot (835° ,204°) Doomsday\'s Legendary Spot'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:151,gy:230,n:'Nona Aerial Supply Depot',r:'dlc2',d:'Campfire (151° ,230°) Nona Aerial Supply Depot'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:242,gy:233,n:'Doomsday\'s Good Spot',r:'dlc2',d:'Fishing Spot (242° ,233°) Doomsday\'s Good Spot'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:301,gy:238,n:'可修复',r:'dlc2',d:'Drawbridge (301° ,238°)'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:326,gy:235,n:'神力裂隙',r:'dlc2',d:'Rift (326° ,235°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:381,gy:226,n:'Doomsday\'s Legendary Spot',r:'dlc2',d:'Fishing Spot (381° ,226°) Doomsday\'s Legendary Spot'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:419,gy:227,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (419° ,227°) Drops: [12 x Iron, 18 x Wood]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:435,gy:238,n:'限时箱子',r:'dlc2',d:'Timed Chest (435° ,238°) Time Available: 15 seconds Rewards: [1 x Blue Eye Orb]'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:502,gy:224,n:'终端',r:'dlc2',d:'Terminal (502° ,224°)'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:538,gy:222,n:'Live Specimen Study Area Terminal',r:'dlc2',d:'Terminal (538° ,222°) Live Specimen Study Area Terminal'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:664,gy:232,n:'神力裂隙',r:'dlc2',d:'Rift (664° ,232°)'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:696,gy:224,n:'Power Generation Subcomplex Terminal',r:'dlc2',d:'Terminal (696° ,224°) Power Generation Subcomplex Terminal'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:775,gy:239,n:'限时箱子',r:'dlc2',d:'Timed Chest (775° ,239°) Time Available: 12 seconds Rewards: [1 x Blue Eye Orb]'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:147,gy:259,n:'Dlc2 Drone To Main Island',r:'dlc2',d:'Entryway (147° ,259°) Dlc2 Drone To Main Island'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:161,gy:247,n:'Doomsday\'s Common Spot',r:'dlc2',d:'Fishing Spot (161° ,247°) Doomsday\'s Common Spot'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:310,gy:249,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (310° ,249°) Required Quest: Treasure Hunt [Side Quest] Drops: [4 x Steel, 4 x Lumbe'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:315,gy:246,n:'神力裂隙',r:'dlc2',d:'Rift (315° ,246°)'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:377,gy:248,n:'传送宝藏',r:'dlc2',d:'Buried Treasure (377° ,248°) To: Circuitry Contraption'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:413,gy:255,n:'Botanical Laboratory Gate Terminal',r:'dlc2',d:'Terminal (413° ,255°) Botanical Laboratory Gate Terminal'},
  {tp:'resource',ic:'icon-fabricator',cl:'#4ade80',gx:418,gy:251,n:'加工厂',r:'dlc2',d:'Fabricator (418° ,252°)'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:436,gy:254,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (436° ,254°) Drops: [7 x Gold Ore]'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:421,gy:258,n:'Flower Power Forever',r:'dlc2',qid:'q_dlc2_1194251',qt:'side',d:'Side Quest (421° ,258°) Flower Power Forever'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:455,gy:259,n:'终端',r:'dlc2',d:'Terminal (456° ,259°)'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:513,gy:244,n:'BOSS',r:'dlc2',d:'Boss (513° ,244°) '},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:543,gy:249,n:'Morgue',r:'dlc2',d:'Campfire (543° ,249°) Morgue'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:589,gy:256,n:'Doomsday\'s Legendary Spot',r:'dlc2',d:'Fishing Spot (589° ,256°) Doomsday\'s Legendary Spot'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:619,gy:251,n:'Doomsday\'s Common Spot',r:'dlc2',d:'Fishing Spot (619° ,251°) Doomsday\'s Common Spot'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:653,gy:241,n:'神力裂隙',r:'dlc2',d:'Rift (653° ,241°)'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:682,gy:258,n:'Morta',r:'dlc2',d:'Link Tower (682° ,258°) Morta'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:689,gy:254,n:'The Gantry Entrance',r:'dlc2',d:'Campfire (689° ,254°) The Gantry Entrance'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:708,gy:243,n:'The Gantry Bridge Terminal',r:'dlc2',d:'Terminal (708° ,243°) The Gantry Bridge Terminal'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:708,gy:257,n:'The Gantry Gate Terminal',r:'dlc2',d:'Terminal (708° ,257°) The Gantry Gate Terminal'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:723,gy:250,n:'Gantry',r:'dlc2',d:'Boss (723° ,250°) Gantry'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:813,gy:257,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (813° ,257°) Drops: [4 x Gold Bar, 1 x Central Processing Unit]'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:359,gy:275,n:'Treasure Hunt',r:'dlc2',qid:'q_dlc2_1282181',qt:'side',d:'Side Quest (359° ,275°) Treasure Hunt'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:365,gy:277,n:'Redwicket Convenience Store',r:'dlc2',d:'Campfire (365° ,277°) Redwicket Convenience Store'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:399,gy:277,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (399° ,277°) Drops: [6 x Steel, 16 x Ceramics]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:410,gy:260,n:'Outside Botanical Labs',r:'dlc2',d:'Campfire (410° ,260°) Outside Botanical Labs'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:443,gy:277,n:'North Decima',r:'dlc2',d:'Link Tower (443° ,277°) North Decima'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:450,gy:263,n:'Decima Complex Courtyard',r:'dlc2',d:'Campfire (450° ,263°) Decima Complex Courtyard'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:486,gy:268,n:'终端',r:'dlc2',d:'Terminal (486° ,268°)'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:519,gy:262,n:'Dlc2 The Veil',r:'dlc2',d:'Audio Log (519° ,262°) Dlc2 The Veil'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:542,gy:278,n:'终端',r:'dlc2',d:'Terminal (542° ,278°)'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:667,gy:266,n:'神力裂隙',r:'dlc2',d:'Rift (667° ,266°)'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:686,gy:261,n:'终端',r:'dlc2',d:'Terminal (686° ,262°)'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:749,gy:273,n:'Morta Complex Eastern Exit',r:'dlc2',d:'Campfire (749° ,273°) Morta Complex Eastern Exit'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:291,gy:287,n:'Redwicket Expansion Site',r:'dlc2',d:'Campfire (291° ,287°) Redwicket Expansion Site'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:428,gy:295,n:'终端',r:'dlc2',d:'Terminal (428° ,295°)'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:449,gy:296,n:'Dlc2 Promotion',r:'dlc2',d:'Audio Log (449° ,296°) Dlc2 Promotion'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:491,gy:280,n:'终端',r:'dlc2',d:'Terminal (491° ,280°)'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:534,gy:291,n:'Nona Logistics Area Gate Terminal',r:'dlc2',d:'Terminal (534° ,292°) Nona Logistics Area Gate Terminal'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:584,gy:286,n:'Good Spot',r:'dlc2',d:'Fishing Spot (584° ,286°) Good Spot'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:610,gy:286,n:'Dead End Camp',r:'dlc2',d:'Campfire (610° ,286°) Dead End Camp'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:628,gy:282,n:'传送宝藏',r:'dlc2',d:'Buried Treasure (628° ,282°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:635,gy:291,n:'Doomsday\'s Good Spot',r:'dlc2',d:'Fishing Spot (635° ,291°) Doomsday\'s Good Spot'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:675,gy:281,n:'神力裂隙',r:'dlc2',d:'Rift (675° ,281°)'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:705,gy:297,n:'埋藏宝藏',r:'dlc2',d:'Buried Treasure (705° ,297°) Drops: [2 x Gold Bar, 2 x Titanium, 1 x Mana Shard]'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:726,gy:293,n:'Dlc2 Evidence',r:'dlc2',d:'Audio Log (726° ,293°) Dlc2 Evidence'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:789,gy:281,n:'Doomsday\'s Good Spot',r:'dlc2',d:'Fishing Spot (789° ,281°) Doomsday\'s Good Spot'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:838,gy:291,n:'入口',r:'dlc2',d:'Entryway (838° ,291°) '},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:261,gy:320,n:'许愿井',r:'dlc2',d:'Wishing Well (262° ,320°)'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:317,gy:307,n:'可修复',r:'dlc2',d:'Drawbridge (317° ,307°)'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:534,gy:312,n:'Near Excavated Tomb',r:'dlc2',d:'Campfire (534° ,312°) Near Excavated Tomb'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:250,gy:328,n:'Doomsday\'s Good Spot',r:'dlc2',d:'Fishing Spot (250° ,328°) Doomsday\'s Good Spot'},
  {tp:'resource',ic:'icon-buried-teleporter',cl:'#c084fc',gx:284,gy:332,n:'传送宝藏',r:'dlc2',d:'Buried Treasure (284° ,332°) To: Angora Activation'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:477,gy:329,n:'Decima Secure Laboratory',r:'dlc2',d:'Campfire (477° ,329°) Decima Secure Laboratory'},
  {tp:'resource',ic:'icon-hatch',cl:'#94a3b8',gx:482,gy:329,n:'避难所',r:'dlc2',d:'Shelter (482° ,329°)'},
  {tp:'tomb',ic:'icon-tomb',cl:'#a78bfa',gx:532,gy:331,n:'古墓',r:'dlc2',d:'Tomb (532° ,332°)'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:555,gy:333,n:'Outside Drone Control Center',r:'dlc2',d:'Campfire (555° ,333°) Outside Drone Control Center'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:289,gy:352,n:'Doomsday\'s Common Spot',r:'dlc2',d:'Fishing Spot (289° ,352°) Doomsday\'s Common Spot'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:362,gy:350,n:'可修复',r:'dlc2',d:'Drawbridge (362° ,350°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:383,gy:357,n:'Good Spot',r:'dlc2',d:'Fishing Spot (383° ,357°) Good Spot'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:413,gy:348,n:'Doomsday\'s Good Spot',r:'dlc2',d:'Fishing Spot (413° ,348°) Doomsday\'s Good Spot'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:508,gy:342,n:'Good Spot',r:'dlc2',d:'Fishing Spot (508° ,342°) Good Spot'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:291,gy:363,n:'Encampment by the Beach',r:'dlc2',d:'Campfire (291° ,363°) Encampment by the Beach'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:358,gy:368,n:'Doomsday\'s Good Spot',r:'dlc2',d:'Fishing Spot (358° ,368°) Doomsday\'s Good Spot'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:383,gy:377,n:'Orinoko',r:'dlc2',d:'Campfire (383° ,377°) Orinoko'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:466,gy:375,n:'Doomsday\'s Common Spot',r:'dlc2',d:'Fishing Spot (466° ,375°) Doomsday\'s Common Spot'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:370,gy:395,n:'South Decima',r:'dlc2',d:'Link Tower (370° ,396°) South Decima'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:402,gy:398,n:'可修复',r:'dlc2',d:'Drawbridge (402° ,398°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:440,gy:418,n:'Doomsday\'s Legendary Spot',r:'dlc2',d:'Fishing Spot (440° ,418°) Doomsday\'s Legendary Spot'},
];

const REG_DLC2=[
  {cn:'Nona Aerial Resupply Depot',color:'#86efac',gx:155,gy:240},
  {cn:'Decima Aerial Resupply Depot',color:'#86efac',gx:612,gy:325},
  {cn:'Morta Aerial Resupply Depot',color:'#86efac',gx:637,gy:143},
  {cn:'Collingwood',color:'#fbbf24',gx:148,gy:147},
  {cn:'Redwicket',color:'#fbbf24',gx:355,gy:276},
  {cn:'Rochester',color:'#fbbf24',gx:604,gy:170},
  {cn:'The Concrete Forest',color:'#86efac',gx:183,gy:77},
  {cn:'Nona Interior Entrance',color:'#fbbf24',gx:250,gy:102},
  {cn:'Cooling Substation',color:'#86efac',gx:261,gy:77},
  {cn:'Conference Area',color:'#86efac',gx:223,gy:82},
  {cn:'Engineering Section',color:'#86efac',gx:213,gy:110},
  {cn:'Theoretical Laboratories',color:'#86efac',gx:238,gy:123},
  {cn:'Defensive System Test Range',color:'#86efac',gx:273,gy:123},
  {cn:'Loading Area',color:'#86efac',gx:308,gy:135},
  {cn:'Main Power Station',color:'#86efac',gx:251,gy:156},
  {cn:'Botanical laboratory',color:'#86efac',gx:425,gy:253},
  {cn:'Live Specimen Study',color:'#86efac',gx:561,gy:218},
  {cn:'Guest Lobby',color:'#86efac',gx:456,gy:297},
  {cn:'Maintenance Section',color:'#86efac',gx:477,gy:243},
  {cn:'Morgue',color:'#86efac',gx:551,gy:251},
  {cn:'Holding Pens',color:'#86efac',gx:414,gy:287},
  {cn:'Settlement Facsimile',color:'#86efac',gx:511,gy:242},
  {cn:'Decima Shelter Depot',color:'#86efac',gx:477,gy:328},
  {cn:'Ancient Tomb Excavation',color:'#fbbf24',gx:540,gy:333},
  {cn:'Drone Control Center',color:'#86efac',gx:570,gy:308},
  {cn:'Decima-Morta Transit Station',color:'#86efac',gx:581,gy:271},
  {cn:'Oninoko',color:'#fbbf24',gx:373,gy:396},
  {cn:'Gillespie',color:'#86efac',gx:278,gy:370},
  {cn:'Kakola',color:'#86efac',gx:261,gy:320},
  {cn:'Eastern Jungle Rampart',color:'#86efac',gx:432,gy:370},
  {cn:'Western Jungle Rampart',color:'#86efac',gx:319,gy:358},
  {cn:'Coastlab',color:'#fbbf24',gx:480,gy:86},
  {cn:'Fincher\'s Scrapyard',color:'#86efac',gx:536,gy:122},
  {cn:'Boreal Country House',color:'#86efac',gx:515,gy:176},
  {cn:'Auxiliary Intelligence Development',color:'#86efac',gx:685,gy:178},
  {cn:'Morta Electrical Substation',color:'#86efac',gx:659,gy:251},
  {cn:'The Gantry Control Room',color:'#86efac',gx:702,gy:250},
  {cn:'The Gantry',color:'#fbbf24',gx:730,gy:250},
  {cn:'Advanced Armament Design Bureau',color:'#86efac',gx:692,gy:276},
  {cn:'Dead End Camp',color:'#86efac',gx:618,gy:289},
  {cn:'Executive Suite',color:'#86efac',gx:720,gy:300},
  {cn:'Temporal Research Laboratory',color:'#fbbf24',gx:803,gy:161},
  {cn:'Morta Complex Main Generator',color:'#86efac',gx:764,gy:221},
];

// ── 宠物地下城 (dlc3) ──
const MD_DLC3=[
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:134,gy:40,n:'神力裂隙',r:'dlc3',d:'Rift (134° ,40°)'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:162,gy:37,n:'可修复',r:'dlc3',d:'Drawbridge (162° ,37°)'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:248,gy:35,n:'神力裂隙',r:'dlc3',d:'Rift (248° ,35°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:302,gy:37,n:'Good Spot',r:'dlc3',d:'Fishing Spot (302° ,37°) Good Spot'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:63,gy:58,n:'Legendary Mana Spot',r:'dlc3',d:'Fishing Spot (63° ,58°) Legendary Mana Spot'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:143,gy:58,n:'限时箱子',r:'dlc3',d:'Timed Chest (143° ,58°) Time Available: 17 seconds Rewards: [3 x Lumber, 1 x Mana Chunk]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:176,gy:51,n:'Frostarium Entrance',r:'dlc3',d:'Campfire (176° ,51°) Frostarium Entrance'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:166,gy:46,n:'Entry Winter',r:'dlc3',d:'Entryway (166° ,46°) Entry Winter'},
  {tp:'resource',ic:'icon-lock2',cl:'#4ade80',gx:179,gy:55,n:'',r:'dlc3',d:'Locked Door (179° ,55°) Expert Lockpick'},
  {tp:'resource',ic:'icon-lock2',cl:'#4ade80',gx:186,gy:55,n:'',r:'dlc3',d:'Locked Door (186° ,55°) Expert Lockpick'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:216,gy:50,n:'埋藏宝藏',r:'dlc3',d:'Buried Treasure (216° ,50°) Drops: [7 x Rubber, 2 x Iron]'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:239,gy:53,n:'神力裂隙',r:'dlc3',d:'Rift (239° ,53°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:251,gy:40,n:'Good Spot',r:'dlc3',d:'Fishing Spot (252° ,40°) Good Spot'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:296,gy:56,n:'Arboretum Gas Station',r:'dlc3',d:'Campfire (296° ,56°) Arboretum Gas Station'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:301,gy:57,n:'Arboretum',r:'dlc3',d:'Link Tower (301° ,57°) Arboretum'},
  {tp:'resource',ic:'icon-unknown',cl:'#94a3b8',gx:362,gy:46,n:'',r:'dlc3',d:'Doghouse (362° ,46°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:88,gy:70,n:'Good Spot',r:'dlc3',d:'Fishing Spot (88° ,70°) Good Spot'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:100,gy:72,n:'埋藏宝藏',r:'dlc3',d:'Buried Treasure (100° ,72°) Drops: [1 x Mana Chunk]'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:107,gy:63,n:'The Beast of Frost',r:'dlc3',d:'Boss (107° ,63°) The Beast of Frost'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:122,gy:63,n:'可修复',r:'dlc3',d:'Drawbridge (122° ,63°)'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:142,gy:77,n:'Frostarium Underhill',r:'dlc3',d:'Campfire (142° ,77°) Frostarium Underhill'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:149,gy:66,n:'许愿井',r:'dlc3',d:'Wishing Well (150° ,66°)'},
  {tp:'resource',ic:'icon-terminal',cl:'#4cc9f0',gx:218,gy:76,n:'Frostarium Bridge Gate',r:'dlc3',d:'Terminal (218° ,76°) Frostarium Bridge Gate'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:232,gy:62,n:'Dlc3 Ad1',r:'dlc3',d:'Audio Log (232° ,62°) Dlc3 Ad1'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:266,gy:73,n:'埋藏宝藏',r:'dlc3',d:'Buried Treasure (266° ,74°) Drops: [7 x Berries]'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:292,gy:80,n:'限时箱子',r:'dlc3',d:'Timed Chest (292° ,80°) Time Available: 8 seconds Rewards: [5 x Electronics, 5 x Lumber]'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:315,gy:80,n:'可修复',r:'dlc3',d:'Drawbridge (315° ,80°)'},
  {tp:'resource',ic:'icon-unknown',cl:'#94a3b8',gx:334,gy:74,n:'',r:'dlc3',d:'Doghouse (334° ,74°)'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:334,gy:73,n:'埋藏宝藏',r:'dlc3',d:'Buried Treasure (334° ,73°) Drops: [3 x Rubber]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:352,gy:62,n:'Arboretum Entrance',r:'dlc3',d:'Campfire (352° ,62°) Arboretum Entrance'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:368,gy:64,n:'Entry Forest',r:'dlc3',d:'Entryway (368° ,64°) Entry Forest'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:386,gy:73,n:'Good Spot',r:'dlc3',d:'Fishing Spot (386° ,73°) Good Spot'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:45,gy:80,n:'神力裂隙',r:'dlc3',d:'Rift (45° ,80°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:74,gy:98,n:'Good Spot',r:'dlc3',d:'Fishing Spot (74° ,98°) Good Spot'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:126,gy:88,n:'神力裂隙',r:'dlc3',d:'Rift (126° ,88°)'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:168,gy:87,n:'Frostarium',r:'dlc3',d:'Link Tower (168° ,87°) Frostarium'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:255,gy:97,n:'The Beast of Timber',r:'dlc3',d:'Boss (255° ,97°) The Beast of Timber'},
  {tp:'resource',ic:'icon-unknown',cl:'#94a3b8',gx:287,gy:99,n:'',r:'dlc3',d:'Doghouse (287° ,99°)'},
  {tp:'resource',ic:'icon-unknown',cl:'#94a3b8',gx:287,gy:98,n:'',r:'dlc3',d:'Doghouse (287° ,98°)'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:289,gy:88,n:'Lone Wolves',r:'dlc3',qid:'q_dlc3_220365',qt:'side',d:'Side Quest (289° ,88°) Lone Wolves'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:316,gy:92,n:'埋藏宝藏',r:'dlc3',d:'Buried Treasure (316° ,92°) Drops: [5 x Wood, 2 x Lumber]'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:304,gy:90,n:'可耕种',r:'dlc3',d:'Farmable (304° ,90°)'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:306,gy:92,n:'可耕种',r:'dlc3',d:'Farmable (306° ,92°)'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:308,gy:89,n:'可耕种',r:'dlc3',d:'Farmable (308° ,90°)'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:308,gy:96,n:'可耕种',r:'dlc3',d:'Farmable (308° ,96°)'},
  {tp:'farmable',ic:'icon-farmable',cl:'#4ade80',gx:310,gy:92,n:'可耕种',r:'dlc3',d:'Farmable (310° ,92°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:331,gy:89,n:'Good Spot',r:'dlc3',d:'Fishing Spot (331° ,89°) Good Spot'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:328,gy:93,n:'神力裂隙',r:'dlc3',d:'Rift (328° ,93°)'},
  {tp:'resource',ic:'icon-wishing-well',cl:'#f0abfc',gx:351,gy:96,n:'许愿井',r:'dlc3',d:'Wishing Well (352° ,96°)'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:358,gy:84,n:'Dlc3 Ad4',r:'dlc3',d:'Audio Log (358° ,84°) Dlc3 Ad4'},
  {tp:'resource',ic:'icon-unknown',cl:'#94a3b8',gx:368,gy:81,n:'',r:'dlc3',d:'Doghouse (368° ,81°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:403,gy:99,n:'Doomsday\'s Common Spot',r:'dlc3',d:'Fishing Spot (403° ,99°) Doomsday\'s Common Spot'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:403,gy:95,n:'Doomsday\'s Common Spot',r:'dlc3',d:'Fishing Spot (403° ,95°) Doomsday\'s Common Spot'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:420,gy:91,n:'The Lab Guardian',r:'dlc3',d:'Boss (420° ,91°) The Lab Guardian'},
  {tp:'resource',ic:'icon-unknown',cl:'#94a3b8',gx:49,gy:114,n:'',r:'dlc3',d:'Doghouse (49° ,114°)'},
  {tp:'resource',ic:'icon-unknown',cl:'#94a3b8',gx:48,gy:114,n:'',r:'dlc3',d:'Doghouse (48° ,114°)'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:58,gy:102,n:'神力裂隙',r:'dlc3',d:'Rift (58° ,102°)'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:99,gy:107,n:'限时箱子',r:'dlc3',d:'Timed Chest (99° ,107°) Time Available: 8 seconds Rewards: [1 x Mana Chunk]'},
  {tp:'resource',ic:'icon-lock',cl:'#4ade80',gx:80,gy:115,n:'',r:'dlc3',d:'Locked Door (80° ,115°) Old Vault Room Key'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:137,gy:106,n:'Water',r:'dlc3',d:'Fishing Spot (137° ,106°) Water'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:158,gy:104,n:'埋藏宝藏',r:'dlc3',d:'Buried Treasure (158° ,104°) Drops: [24 x Plant Matter, 12 x Bone]'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:233,gy:116,n:'Dlc3 Ad3',r:'dlc3',d:'Audio Log (233° ,116°) Dlc3 Ad3'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:248,gy:119,n:'Ward\'s Lab',r:'dlc3',d:'Campfire (248° ,119°) Ward\'s Lab'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:273,gy:100,n:'可修复',r:'dlc3',d:'Drawbridge (273° ,100°)'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:262,gy:117,n:'限时箱子',r:'dlc3',d:'Timed Chest (262° ,117°) Time Available: 10 seconds Rewards: [2 x Mana Shard]'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:295,gy:112,n:'Legendary Spot',r:'dlc3',d:'Fishing Spot (295° ,112°) Legendary Spot'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:294,gy:102,n:'Surrounded Farm',r:'dlc3',qid:'q_dlc3_268197',qt:'key',d:'Main Quest (294° ,102°) Surrounded Farm'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:312,gy:116,n:'Weird Spot',r:'dlc3',d:'Fishing Spot (312° ,116°) Weird Spot'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:323,gy:103,n:'可修复',r:'dlc3',d:'Drawbridge (323° ,103°)'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:354,gy:104,n:'神力裂隙',r:'dlc3',d:'Rift (354° ,104°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:40,gy:120,n:'Mana Spot',r:'dlc3',d:'Fishing Spot (40° ,120°) Mana Spot'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:56,gy:125,n:'The Groundskeeper',r:'dlc3',d:'Boss (56° ,125°) The Groundskeeper'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:88,gy:122,n:'Isle of Mana Entrance',r:'dlc3',d:'Campfire (88° ,122°) Isle of Mana Entrance'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:97,gy:125,n:'Entry Dlc1',r:'dlc3',d:'Entryway (97° ,125°) Entry Dlc1'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:143,gy:135,n:'神力裂隙',r:'dlc3',d:'Rift (143° ,135°)'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:168,gy:129,n:'神力裂隙',r:'dlc3',d:'Rift (168° ,129°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:186,gy:122,n:'Weird Spot',r:'dlc3',d:'Fishing Spot (186° ,122°) Weird Spot'},
  {tp:'resource',ic:'icon-lock3',cl:'#4ade80',gx:204,gy:134,n:'',r:'dlc3',d:'Locked Door (204° ,134°) Master Lockpick'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:232,gy:120,n:'Vivarium Nexus',r:'dlc3',d:'Link Tower (232° ,120°) Vivarium Nexus'},
  {tp:'resource',ic:'icon-lock',cl:'#4ade80',gx:240,gy:126,n:'',r:'dlc3',d:'Locked Door (240° ,126°) Frostarium Key'},
  {tp:'resource',ic:'icon-lock',cl:'#4ade80',gx:240,gy:126,n:'',r:'dlc3',d:'Locked Door (240° ,126°) Arboretum Key'},
  {tp:'resource',ic:'icon-lock',cl:'#4ade80',gx:240,gy:126,n:'',r:'dlc3',d:'Locked Door (240° ,126°) Desolatum Key'},
  {tp:'resource',ic:'icon-lock',cl:'#4ade80',gx:240,gy:127,n:'',r:'dlc3',d:'Locked Door (240° ,127°) Terrarium Key'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:240,gy:120,n:'Entry Reward Room',r:'dlc3',d:'Entryway (240° ,120°) Entry Reward Room'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:240,gy:130,n:'Pet Isle Center Elevator',r:'dlc3',d:'Entryway (240° ,130°) Pet Isle Center Elevator'},
  {tp:'resource',ic:'icon-audio-log',cl:'#94a3b8',gx:259,gy:125,n:'Dlc3 Ad2',r:'dlc3',d:'Audio Log (259° ,125°) Dlc3 Ad2'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:331,gy:121,n:'可修复',r:'dlc3',d:'Drawbridge (331° ,121°)'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:378,gy:120,n:'Isle of Doom North',r:'dlc3',d:'Campfire (378° ,120°) Isle of Doom North'},
  {tp:'resource',ic:'icon-lock3',cl:'#4ade80',gx:404,gy:130,n:'',r:'dlc3',d:'Locked Door (404° ,130°) Master Lockpick'},
  {tp:'resource',ic:'icon-lock3',cl:'#4ade80',gx:412,gy:130,n:'',r:'dlc3',d:'Locked Door (412° ,130°) Master Lockpick'},
  {tp:'resource',ic:'icon-unknown',cl:'#94a3b8',gx:427,gy:135,n:'',r:'dlc3',d:'Doghouse (427° ,135°)'},
  {tp:'resource',ic:'icon-unknown',cl:'#94a3b8',gx:427,gy:131,n:'',r:'dlc3',d:'Doghouse (427° ,131°)'},
  {tp:'resource',ic:'icon-unknown',cl:'#94a3b8',gx:427,gy:132,n:'',r:'dlc3',d:'Doghouse (427° ,132°)'},
  {tp:'resource',ic:'icon-stash',cl:'#86efac',gx:42,gy:159,n:'藏匿处',r:'dlc3',d:'Stash (42° ,159°) Stash Search Rewards: [3 x Lobster, 1 x Titanium] Stash Drops: [1 x Scrap Wood]'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:74,gy:152,n:'Isle of Mana',r:'dlc3',d:'Link Tower (74° ,152°) Isle of Mana'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:138,gy:152,n:'埋藏宝藏',r:'dlc3',d:'Buried Treasure (138° ,152°)'},
  {tp:'resource',ic:'icon-lock3',cl:'#4ade80',gx:184,gy:151,n:'',r:'dlc3',d:'Locked Door (184° ,151°) Master Lockpick'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:216,gy:144,n:'The Beast of Desolation',r:'dlc3',d:'Boss (216° ,144°) The Beast of Desolation'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:214,gy:156,n:'Barracks B Truck Stop',r:'dlc3',d:'Campfire (214° ,156°) Barracks B Truck Stop'},
  {tp:'boss',ic:'icon-boss',cl:'#ef4444',gx:254,gy:141,n:'The Beast of Terra',r:'dlc3',d:'Boss (254° ,141°) The Beast of Terra'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:279,gy:146,n:'Terrarium',r:'dlc3',d:'Link Tower (279° ,146°) Terrarium'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:272,gy:154,n:'Wisdom\'s Basketball Field',r:'dlc3',d:'Campfire (272° ,154°) Wisdom\'s Basketball Field'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:293,gy:143,n:'可修复',r:'dlc3',d:'Drawbridge (293° ,143°)'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:300,gy:158,n:'埋藏宝藏',r:'dlc3',d:'Buried Treasure (300° ,158°) Drops: [1 x Scrap Electronics, 1 x Corn]'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:311,gy:153,n:'Forgotten Wisdom',r:'dlc3',qid:'q_dlc3_366227',qt:'side',d:'Side Quest (311° ,153°) Forgotten Wisdom'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:323,gy:141,n:'Weird Spot',r:'dlc3',d:'Fishing Spot (323° ,141°) Weird Spot'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:336,gy:156,n:'Good Spot',r:'dlc3',d:'Fishing Spot (336° ,156°) Good Spot'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:381,gy:144,n:'Entry Dlc2',r:'dlc3',d:'Entryway (381° ,144°) Entry Dlc2'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:402,gy:146,n:'Isle of Doom',r:'dlc3',d:'Link Tower (402° ,146°) Isle of Doom'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:405,gy:140,n:'Isle of Doom South',r:'dlc3',d:'Campfire (405° ,140°) Isle of Doom South'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:64,gy:166,n:'埋藏宝藏',r:'dlc3',d:'Buried Treasure (64° ,166°) Required Quest: The Underdog [Side Quest] Drops: [4 x Bone, 1 x Mana Bea'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:67,gy:176,n:'埋藏宝藏',r:'dlc3',d:'Buried Treasure (67° ,176°) Required Quest: The Underdog [Side Quest] Drops: [3 x Mana Bead, 1 x Bon'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:87,gy:172,n:'埋藏宝藏',r:'dlc3',d:'Buried Treasure (87° ,172°) Required Quest: The Underdog [Side Quest] Drops: [4 x Bone, 1 x Mana Bea'},
  {tp:'resource',ic:'icon-unknown',cl:'#94a3b8',gx:100,gy:171,n:'',r:'dlc3',d:'Doghouse (100° ,171°)'},
  {tp:'resource',ic:'icon-lock3',cl:'#4ade80',gx:198,gy:165,n:'',r:'dlc3',d:'Locked Door (198° ,165°) Master Lockpick'},
  {tp:'resource',ic:'icon-hatch',cl:'#94a3b8',gx:181,gy:168,n:'避难所',r:'dlc3',d:'Shelter (181° ,168°)'},
  {tp:'tower',ic:'icon-link-tower',cl:'#fb923c',gx:216,gy:161,n:'Desolatum',r:'dlc3',d:'Link Tower (216° ,161°) Desolatum'},
  {tp:'quest',ic:'icon-quest',cl:'#60a5fa',gx:201,gy:175,n:'Stolen Pet',r:'dlc3',qid:'q_dlc3_404211',qt:'side',d:'Side Quest (201° ,175°) Stolen Pet'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:314,gy:161,n:'可修复',r:'dlc3',d:'Drawbridge (314° ,162°)'},
  {tp:'resource',ic:'icon-fixable',cl:'#4ade80',gx:305,gy:169,n:'可修复',r:'dlc3',d:'Drawbridge (305° ,169°)'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:329,gy:177,n:'神力裂隙',r:'dlc3',d:'Rift (329° ,177°)'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:350,gy:176,n:'埋藏宝藏',r:'dlc3',d:'Buried Treasure (350° ,176°)'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:365,gy:167,n:'神力裂隙',r:'dlc3',d:'Rift (365° ,167°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:380,gy:173,n:'Doomsday\'s Legendary Spot',r:'dlc3',d:'Fishing Spot (380° ,173°) Doomsday\'s Legendary Spot'},
  {tp:'resource',ic:'icon-unknown',cl:'#94a3b8',gx:408,gy:175,n:'',r:'dlc3',d:'Doghouse (408° ,175°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:429,gy:172,n:'Doomsday\'s Common Spot',r:'dlc3',d:'Fishing Spot (429° ,172°) Doomsday\'s Common Spot'},
  {tp:'resource',ic:'icon-lock',cl:'#4ade80',gx:420,gy:169,n:'',r:'dlc3',d:'Locked Door (420° ,169°) Vault Room Key'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:55,gy:181,n:'埋藏宝藏',r:'dlc3',d:'Buried Treasure (55° ,181°) Required Quest: The Underdog [Side Quest] Drops: [4 x Bone, 1 x Mana Bea'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:63,gy:194,n:'Good Spot',r:'dlc3',d:'Fishing Spot (63° ,194°) Good Spot'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:89,gy:184,n:'埋藏宝藏',r:'dlc3',d:'Buried Treasure (89° ,184°) Required Quest: The Underdog [Side Quest] Drops: [4 x Bone, 1 x Mana Bea'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:142,gy:191,n:'Good Spot',r:'dlc3',d:'Fishing Spot (142° ,191°) Good Spot'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:154,gy:184,n:'埋藏宝藏',r:'dlc3',d:'Buried Treasure (154° ,184°)'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:178,gy:182,n:'Desolatum Base',r:'dlc3',d:'Campfire (178° ,182°) Desolatum Base'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:166,gy:188,n:'Entry Desert',r:'dlc3',d:'Entryway (166° ,188°) Entry Desert'},
  {tp:'treasure',ic:'icon-chest',cl:'#fbbf24',gx:206,gy:199,n:'限时箱子',r:'dlc3',d:'Timed Chest (206° ,199°) Time Available: 20 seconds Rewards: [3 x Mana Chunk]'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:226,gy:184,n:'埋藏宝藏',r:'dlc3',d:'Buried Treasure (226° ,184°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:262,gy:182,n:'Good Spot',r:'dlc3',d:'Fishing Spot (262° ,182°) Good Spot'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:287,gy:190,n:'神力裂隙',r:'dlc3',d:'Rift (287° ,190°)'},
  {tp:'resource',ic:'icon-entryway',cl:'#86efac',gx:313,gy:197,n:'Entry Ancient',r:'dlc3',d:'Entryway (313° ,197°) Entry Ancient'},
  {tp:'treasure',ic:'icon-buried-treasure',cl:'#fbbf24',gx:304,gy:186,n:'埋藏宝藏',r:'dlc3',d:'Buried Treasure (304° ,186°) Drops: [2 x Plastics, 3 x Hide, 6 x Iron]'},
  {tp:'campfire',ic:'icon-campfire',cl:'#ff7043',gx:321,gy:189,n:'Terrarium Crossroads',r:'dlc3',d:'Campfire (321° ,189°) Terrarium Crossroads'},
  {tp:'rift',ic:'icon-rift',cl:'#c084fc',gx:395,gy:188,n:'神力裂隙',r:'dlc3',d:'Rift (395° ,188°)'},
  {tp:'fishing',ic:'icon-fishing-spot',cl:'#38bdf8',gx:285,gy:200,n:'Good Spot',r:'dlc3',d:'Fishing Spot (285° ,200°) Good Spot'},
];

const REG_DLC3=[
  {cn:'Rustic Serenity Settlement',color:'#86efac',gx:341,gy:60},
  {cn:'Arctic Workers\' Retreat',color:'#86efac',gx:197,gy:70},
  {cn:'The Ward',color:'#86efac',gx:240,gy:120},
  {cn:'Mirage Labor Barracks',color:'#86efac',gx:194,gy:162},
  {cn:'Wisdom\'s Grove Academy',color:'#86efac',gx:285,gy:170},
  {cn:'Pet Cemetery',color:'#86efac',gx:74,gy:170},
  {cn:'The Lab Scientists\' Villa',color:'#86efac',gx:412,gy:120},
  {cn:'Secured Retreat',color:'#86efac',gx:409,gy:168},
  {cn:'Jimmy\'s House',color:'#86efac',gx:152,gy:140},
  {cn:'Barracks A',color:'#86efac',gx:208,gy:182},
  {cn:'Barracks B',color:'#86efac',gx:201,gy:155},
  {cn:'Educators\' Dormitory',color:'#86efac',gx:345,gy:185},
  {cn:'Students\' Dormitory',color:'#86efac',gx:309,gy:134},
  {cn:'Principal\'s House',color:'#86efac',gx:269,gy:149},
  {cn:'Wisdom\'s Library',color:'#86efac',gx:265,gy:166},
  {cn:'The Bar',color:'#86efac',gx:193,gy:83},
  {cn:'The Wolf Farm',color:'#86efac',gx:293,gy:98},
];

// DLC Quest Data
QD['q_dlc1_516186']={t:'side',n:'Farming with Enhanced Seed Bag',mapId:'dlc1',s:['Side Quest (366° ,102°) Farming with Enhanced Seed Bag'],rw:'',locs:[{label:'Farming with Enhanced Seed Bag',gx:366,gy:102,tp:'start'}]};
QD['q_dlc1_548169']={t:'side',n:'Sawmill Building Basics',mapId:'dlc1',s:['Side Quest (684° ,109°) Sawmill Building Basics'],rw:'',locs:[{label:'Sawmill Building Basics',gx:683,gy:109,tp:'start'}]};
QD['q_dlc1_846171']={t:'side',n:'Vault into Past',mapId:'dlc1',s:['Side Quest (793° ,165°) Vault into Past'],rw:'',locs:[{label:'Vault into Past',gx:793,gy:165,tp:'start'}]};
QD['q_dlc1_1118254']={t:'side',n:'Sawmill Building Basics',mapId:'dlc1',s:['Side Quest (640° ,226°) Sawmill Building Basics'],rw:'',locs:[{label:'Sawmill Building Basics',gx:640,gy:226,tp:'start'}]};
QD['q_dlc1_1502119']={t:'side',n:'Farming with Enhanced Seed Bag',mapId:'dlc1',s:['Side Quest (620° ,312°) Farming with Enhanced Seed Bag'],rw:'',locs:[{label:'Farming with Enhanced Seed Bag',gx:620,gy:311,tp:'start'}]};
QD['q_dlc1_1584342']={t:'side',n:'Desperate Existence',mapId:'dlc1',s:['Side Quest (487° ,334°) Desperate Existence'],rw:'',locs:[{label:'Desperate Existence',gx:487,gy:334,tp:'start'}]};
QD['q_dlc1_1684049']={t:'side',n:'Smelter Building Basics',mapId:'dlc1',s:['Side Quest (526° ,358°) Smelter Building Basics'],rw:'',locs:[{label:'Smelter Building Basics',gx:526,gy:358,tp:'start'}]};
QD['q_dlc1_1700229']={t:'key',n:'Spirit Trouble',mapId:'dlc1',s:['Main Quest (696° ,345°) Spirit Trouble'],rw:'',locs:[{label:'Spirit Trouble',gx:696,gy:345,tp:'start'}]};
QD['q_dlc2_620311']={t:'side',n:'Go With the Flow',mapId:'dlc2',s:['Side Quest (444° ,128°) Go With the Flow'],rw:'',locs:[{label:'Go With the Flow',gx:444,gy:128,tp:'start'}]};
QD['q_dlc2_702294']={t:'side',n:'Sawmill Building Basics',mapId:'dlc2',s:['Side Quest (310° ,145°) Sawmill Building Basics'],rw:'',locs:[{label:'Sawmill Building Basics',gx:310,gy:145,tp:'start'}]};
QD['q_dlc2_782322']={t:'side',n:'Turn Over A New Leaf',mapId:'dlc2',s:['Side Quest (143° ,172°) Turn Over A New Leaf'],rw:'',locs:[{label:'Turn Over A New Leaf',gx:143,gy:172,tp:'start'}]};
QD['q_dlc2_794240']={t:'side',n:'Smelter Building Basics',mapId:'dlc2',s:['Side Quest (268° ,162°) Smelter Building Basics'],rw:'',locs:[{label:'Smelter Building Basics',gx:268,gy:162,tp:'start'}]};
QD['q_dlc2_894108']={t:'side',n:'Strike the Earth',mapId:'dlc2',s:['Side Quest (312° ,196°) Strike the Earth'],rw:'',locs:[{label:'Strike the Earth',gx:312,gy:196,tp:'start'}]};
QD['q_dlc2_918129']={t:'side',n:'On to the Scrap Heap',mapId:'dlc2',s:['Side Quest (554° ,182°) On to the Scrap Heap'],rw:'',locs:[{label:'On to the Scrap Heap',gx:554,gy:182,tp:'start'}]};
QD['q_dlc2_924244']={t:'side',n:'The Legend of the Magic Sword',mapId:'dlc2',s:['Side Quest (617° ,185°) The Legend of the Magic Sword'],rw:'',locs:[{label:'The Legend of the Magic Sword',gx:617,gy:185,tp:'start'}]};
QD['q_dlc2_1194251']={t:'side',n:'Flower Power Forever',mapId:'dlc2',s:['Side Quest (421° ,258°) Flower Power Forever'],rw:'',locs:[{label:'Flower Power Forever',gx:421,gy:258,tp:'start'}]};
QD['q_dlc2_1282181']={t:'side',n:'Treasure Hunt',mapId:'dlc2',s:['Side Quest (359° ,275°) Treasure Hunt'],rw:'',locs:[{label:'Treasure Hunt',gx:359,gy:275,tp:'start'}]};
QD['q_dlc3_220365']={t:'side',n:'Lone Wolves',mapId:'dlc3',s:['Side Quest (289° ,88°) Lone Wolves'],rw:'',locs:[{label:'Lone Wolves',gx:289,gy:88,tp:'start'}]};
QD['q_dlc3_268197']={t:'key',n:'Surrounded Farm',mapId:'dlc3',s:['Main Quest (294° ,102°) Surrounded Farm'],rw:'',locs:[{label:'Surrounded Farm',gx:294,gy:102,tp:'start'}]};
QD['q_dlc3_366227']={t:'side',n:'Forgotten Wisdom',mapId:'dlc3',s:['Side Quest (311° ,153°) Forgotten Wisdom'],rw:'',locs:[{label:'Forgotten Wisdom',gx:311,gy:153,tp:'start'}]};
QD['q_dlc3_404211']={t:'side',n:'Stolen Pet',mapId:'dlc3',s:['Side Quest (201° ,175°) Stolen Pet'],rw:'',locs:[{label:'Stolen Pet',gx:201,gy:175,tp:'start'}]};

// ── Filter & Layer groups ──
const FD=[
  {id:'campfire',lb:'营火',cl:'#ff7043',ic:'icon-campfire'},
  {id:'tower',   lb:'链塔',cl:'#fb923c',ic:'icon-link-tower'},
  {id:'quest',   lb:'任务',cl:'#60a5fa',ic:'icon-quest'},
  {id:'tomb',    lb:'古墓',cl:'#a78bfa',ic:'icon-tomb'},
  {id:'fishing', lb:'钓鱼',cl:'#38bdf8',ic:'icon-fishing-spot'},
  {id:'treasure',lb:'宝藏',cl:'#fbbf24',ic:'icon-buried-treasure'},
  {id:'boss',    lb:'BOSS',cl:'#ef4444',ic:'icon-boss'},
  {id:'resource',lb:'资源',cl:'#4ade80',ic:'icon-fixable'},
  {id:'farmable',lb:'农场',cl:'#86efac',ic:'icon-farmable'},
  {id:'rift',    lb:'裂隙',cl:'#c084fc',ic:'icon-rift'},
];
const AF=new Set(FD.map(f=>f.id));

// 聚合组工厂（各地图共用同一样式）
function mkClusterOpts(){
  return {
    chunkedLoading:true,showCoverageOnHover:false,spiderfyOnMaxZoom:false,
    disableClusteringAtZoom:4,maxClusterRadius:60,
    iconCreateFunction:function(cluster){
      const count=cluster.getChildCount();
      let bg='rgba(76,201,240,.88)',ring='rgba(76,201,240,.3)';
      if(count>=50){bg='rgba(239,68,68,.88)';ring='rgba(239,68,68,.28)';}
      else if(count>=10){bg='rgba(212,149,42,.88)';ring='rgba(212,149,42,.28)';}
      const dim=count>=50?50:count>=10?44:38;
      const fs=count>=100?13:15;
      return L.divIcon({
        html:`<div style="width:${dim}px;height:${dim}px;border-radius:50%;background:${bg};border:2px solid rgba(255,255,255,.28);box-shadow:0 0 0 5px ${ring},0 3px 14px rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:${fs}px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.9);">${count}</div>`,
        className:'',iconSize:L.point(dim+10,dim+10),iconAnchor:L.point((dim+10)/2,(dim+10)/2)
      });
    }
  };
}
const clusterGroup=L.markerClusterGroup(mkClusterOpts());     // 主岛，默认不加入 map
const clusterGroupUC=L.markerClusterGroup(mkClusterOpts());   // 地下城
const clusterGroupDLC1=L.markerClusterGroup(mkClusterOpts()); // 冥界
const clusterGroupDLC2=L.markerClusterGroup(mkClusterOpts()); // 末日
const clusterGroupDLC3=L.markerClusterGroup(mkClusterOpts()); // 宠物地下城

const LG={};
FD.forEach(f=>{ LG[f.id]=[]; });

// ── Region list data ──
const REG=[
  {cn:'迦百农',    color:'#e8a020',gx:1391,gy:527},
  {cn:'卡纳维拉尔',color:'#4cc9f0',gx:1608,gy:537},
  {cn:'柴火',      color:'#86efac',gx:1422,gy:408},
  {cn:'篱笆地',    color:'#6ee7b7',gx:1397,gy:637},
  {cn:'沼泽草地',  color:'#34d399',gx:1551,gy:787},
  {cn:'北欧化工',  color:'#67e8f9',gx:1385,gy:201},
  {cn:'大角星',    color:'#93c5fd',gx:1666,gy:220},
  {cn:'爱尔兰',    color:'#a3e635',gx:1097,gy:221},
  {cn:'冰霜',      color:'#bfdbfe',gx:847, gy:213},
  {cn:'北极星',    color:'#e0f2fe',gx:566, gy:129},
  {cn:'冰霜号角',  color:'#a5f3fc',gx:189, gy:91 },
  {cn:'峡谷',      color:'#fb923c',gx:1048,gy:597},
  {cn:'中枢',      color:'#c084fc',gx:665, gy:433},
  {cn:'西港',      color:'#fda4af',gx:352, gy:444},
  {cn:'夕阳沙漠',  color:'#fbbf24',gx:659, gy:660},
  {cn:'蛇工',      color:'#f87171',gx:1172,gy:848},
  {cn:'瓦肯镇',    color:'#fca5a5',gx:145, gy:606},
  {cn:'索拉里斯星',color:'#fde68a',gx:325, gy:740},
  {cn:'王冠地下',  color:'#d8b4fe',gx:894, gy:415},
  {cn:'王冠',      color:'#f9a8d4',gx:894, gy:415},
];

// ── Build markers ──
function buildMarkers(){
  const TL={campfire:'🔥 营火',tower:'📡 链塔',quest:'❗ 任务',tomb:'⚰ 古墓',
    fishing:'🎣 钓鱼',treasure:'💎 宝藏',boss:'☠ BOSS',resource:'⚙ 资源',
    farmable:'🌱 农场',rift:'✨ 裂隙'};
  MD.forEach(m=>{
    const mk=L.marker(g2l(m.gx,m.gy),{icon:mkIcon(m.ic,m.cl)});
    const q=m.qid?QD[m.qid]:null;
    let h=`<div class="pi"><div class="pt">${TL[m.tp]||m.tp}</div>`;
    if(q){const bc={main:'bm',side:'bs',key:'bk'}[m.qt]||'bs';h+=`<span class="pbadge ${bc}">${{main:'主线',side:'支线',key:'关键支线'}[m.qt]}</span><br>`;}
    h+=`<div class="pn">${m.n}</div><div class="pr">📍 ${m.r}</div><div class="pc">坐标: ${m.gx}°, ${m.gy}°</div><div class="pd">${m.d}</div>`;
    if(q){
      h+=`<div class="pdiv"></div><div class="pqt">${q.n}</div>`;
      q.s.forEach(s=>{h+=`<div class="ps">${s}</div>`;});
      h+=`<div class="prew">${q.rw}</div>`;
    }
    h+=`</div>`;
    mk.bindPopup(h,{maxWidth:340,className:''});
    mk.on('popupopen',()=>{const el=mk.getElement();if(el){el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}});
    mk.on('click',()=>{if(m.qid)hlCard(m.qid);});
    if(LG[m.tp]){
      mk._dystp = m.tp;  // store type for cluster toggle
      LG[m.tp].push(mk);
      // 默认散点模式，直接加到 rawGroup
      rawGroup.addLayer(mk);
    }
  });
}

// ── 地下城 marker 构建 ──
function buildMarkersUC(){
  const TL={campfire:'🔥 营火',tower:'📡 链塔',quest:'❗ 任务',tomb:'⚰ 古墓',
    fishing:'🎣 钓鱼',treasure:'💎 宝藏',boss:'☠ BOSS',resource:'⚙ 资源'};
  MD_UC.forEach(m=>{
    const mk=L.marker(g2l_uc(m.gx,m.gy),{icon:mkIcon(m.ic,m.cl)});
    const q=m.qid?QD[m.qid]:null;
    let h=`<div class="pi"><div class="pt">${TL[m.tp]||m.tp}</div>`;
    if(q){const bc={main:'bm',side:'bs',key:'bk'}[m.qt]||'bs';h+=`<span class="pbadge ${bc}">${{main:'主线',side:'支线',key:'关键支线'}[m.qt]}</span><br>`;}
    h+=`<div class="pn">${m.n}</div><div class="pr">📍 地下城</div><div class="pc">坐标: ${m.gx}°, ${m.gy}°</div><div class="pd">${m.d}</div>`;
    if(q){
      h+=`<div class="pdiv"></div><div class="pqt">${q.n}</div>`;
      q.s.forEach(s=>{h+=`<div class="ps">${s}</div>`;});
      h+=`<div class="prew">${q.rw}</div>`;
    }
    h+=`</div>`;
    mk.bindPopup(h,{maxWidth:340,className:''});
    mk.on('popupopen',()=>{const el=mk.getElement();if(el){el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}});
    mk.on('click',()=>{if(m.qid)hlCard(m.qid);});
    markersByMap.undercrown.push(mk);
    rawGroupUC.addLayer(mk);
  });
}

// ── DLC marker 构建（通用：传入数据、layer group、坐标转换函数）──
function buildMarkersDLC(mdArr, layerGroup, toLatLng){
  const TL={campfire:'🔥 营火',tower:'📡 链塔',quest:'❗ 任务',tomb:'⚰ 古墓',
    fishing:'🎣 钓鱼',treasure:'💎 宝藏',boss:'☠ BOSS',resource:'⚙ 资源',
    rift:'✨ 裂隙',farmable:'🌱 可耕种'};
  mdArr.forEach(m=>{
    const mk=L.marker(toLatLng(m.gx,m.gy),{icon:mkIcon(m.ic,m.cl)});
    const q=m.qid?QD[m.qid]:null;
    let h=`<div class="pi"><div class="pt">${TL[m.tp]||m.tp}</div>`;
    if(q){const bc={main:'bm',side:'bs',key:'bk'}[m.qt]||'bs';h+=`<span class="pbadge ${bc}">${{main:'主线',side:'支线',key:'关键支线'}[m.qt]}</span><br>`;}
    const mapLabel=m.r==='dlc1'?'冥界':m.r==='dlc2'?'末日':m.r==='dlc3'?'宠物地下城':'地下城';
    h+=`<div class="pn">${m.n}</div><div class="pr">📍 ${mapLabel}</div><div class="pc">坐标: ${m.gx}°, ${m.gy}°</div><div class="pd">${m.d}</div>`;
    if(q){h+=`<div class="pdiv"></div><div class="pqt">${q.n}</div>`;q.s.forEach(s=>{h+=`<div class="ps">${s}</div>`;});h+=`<div class="prew">${q.rw||'—'}</div>`;}
    h+=`</div>`;
    mk.bindPopup(h,{maxWidth:340,className:''});
    mk.on('popupopen',()=>{const el=mk.getElement();if(el){el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}});
    mk.on('click',()=>{if(m.qid)hlCard(m.qid);});
    if(markersByMap[m.r])markersByMap[m.r].push(mk);
    layerGroup.addLayer(mk);
  });
}

// ── Cluster toggle ──
let clusteringEnabled = false; // 默认关闭聚合
// 用于不聚合模式下直接持有 marker 的普通层组
const rawGroup = L.layerGroup().addTo(map); // 默认显示散点
const rawGroupUC = L.layerGroup(); // 地下城 markers（切换到地下城时才加入）
const rawGroupDLC1 = L.layerGroup();
const rawGroupDLC2 = L.layerGroup();
const rawGroupDLC3 = L.layerGroup();
// 各地图 marker 实例列表（用于聚合切换时重建 layer group）
const markersByMap={undercrown:[],dlc1:[],dlc2:[],dlc3:[]};

// 地下城区域名称标签层
const regionLabelGroupUC = L.layerGroup();
[
  {name:'地下城西入口', gx:890, gy:372},
  {name:'地下城东入口', gx:1076,gy:372},
  {name:'塌陷隧道',     gx:1007,gy:349},
  {name:'装卸区',       gx:1031,gy:340},
  {name:'迷失洞窟',     gx:969, gy:428},
  {name:'王冠站电梯',   gx:982, gy:351},
].forEach(loc=>{
  L.marker(g2l_uc(loc.gx,loc.gy),{
    icon:L.divIcon({className:'region-label',
      html:`<div style="color:#c8d4e0;opacity:.7;font-size:11px;font-family:'Rajdhani',sans-serif;font-weight:700;text-shadow:0 1px 4px rgba(0,0,0,1);white-space:nowrap;pointer-events:none;">${loc.name}</div>`,
      iconAnchor:[30,8]}),interactive:false}).addTo(regionLabelGroupUC);
});

function toggleClustering(){
  clusteringEnabled = !clusteringEnabled;
  const btn = document.getElementById('clusterToggle');
  const icon = document.getElementById('clusterIcon');
  const label = document.getElementById('clusterLabel');

  if(currentMap==='island'){
    // 主岛：按类型过滤的聚合逻辑
    const activeMks = [];
    FD.forEach(f => { if(AF.has(f.id)) activeMks.push(...LG[f.id]); });
    if(clusteringEnabled){
      rawGroup.clearLayers();
      rawGroup.remove();
      activeMks.forEach(mk => clusterGroup.addLayer(mk));
      if(!map.hasLayer(clusterGroup)) clusterGroup.addTo(map);
    } else {
      clusterGroup.clearLayers();
      clusterGroup.remove();
      rawGroup.clearLayers();
      activeMks.forEach(mk => rawGroup.addLayer(mk));
      rawGroup.addTo(map);
    }
  } else {
    // 非主岛地图：整体聚合切换
    const cfg=MAP_CFG[currentMap];
    const mks=markersByMap[currentMap]||[];
    if(clusteringEnabled){
      cfg.rawGroup.clearLayers();
      if(map.hasLayer(cfg.rawGroup))cfg.rawGroup.remove();
      mks.forEach(mk=>cfg.clusterGroup.addLayer(mk));
      if(!map.hasLayer(cfg.clusterGroup))cfg.clusterGroup.addTo(map);
    } else {
      cfg.clusterGroup.clearLayers();
      if(map.hasLayer(cfg.clusterGroup))cfg.clusterGroup.remove();
      mks.forEach(mk=>cfg.rawGroup.addLayer(mk));
      if(!map.hasLayer(cfg.rawGroup))cfg.rawGroup.addTo(map);
    }
  }

  if(clusteringEnabled){
    icon.textContent = '⬡';
    label.textContent = '聚合: 开';
    btn.style.background = 'rgba(76,201,240,0.12)';
    btn.style.borderColor = 'var(--border)';
    btn.style.color = 'var(--accent2)';
  } else {
    icon.textContent = '○';
    label.textContent = '聚合: 关';
    btn.style.background = 'rgba(239,68,68,0.1)';
    btn.style.borderColor = 'rgba(239,68,68,0.4)';
    btn.style.color = '#ef4444';
  }
}

// ── Filter bar ──
function buildFilterBar(){
  const bar=document.getElementById('filterBar');
  FD.forEach(f=>{
    const btn=document.createElement('button');btn.className='chip on';
    btn.innerHTML=`<img src="${IBASE}${f.ic}.png" style="width:16px;height:16px;image-rendering:pixelated;filter:drop-shadow(0 0 2px ${f.cl});opacity:.9;" onerror="this.style.display='none'"/>${f.lb}`;
    btn.title=f.lb;
    btn.onclick=()=>{
      const group = clusteringEnabled ? clusterGroup : rawGroup;
      if(AF.has(f.id)){
        AF.delete(f.id);btn.classList.remove('on');
        LG[f.id].forEach(mk=>group.removeLayer(mk));
      } else {
        AF.add(f.id);btn.classList.add('on');
        LG[f.id].forEach(mk=>group.addLayer(mk));
      }
    };
    bar.appendChild(btn);
  });
}

// ── Region list ──
let currentRegion=null;
const REG_BY_MAP={island:REG,undercrown:REG_UC,dlc1:REG_DLC1,dlc2:REG_DLC2,dlc3:REG_DLC3};

function buildRegionList(){
  const list=document.getElementById('regionList');
  list.innerHTML='';
  const cfg=MAP_CFG[currentMap];
  const regions=REG_BY_MAP[currentMap]||[];
  const dotColor=currentMap==='island'?'#d4952a':'#a78bfa';
  const all=document.createElement('div');all.className='ritem active';
  all.innerHTML=`<span class="rdot" style="background:${dotColor}"></span><div><div class="rname">全 部</div></div>`;
  all.onclick=()=>{
    document.querySelectorAll('.ritem').forEach(e=>e.classList.remove('active'));
    all.classList.add('active');
    map.fitBounds(cfg.fitBounds,{animate:true});
    currentRegion=null;runSearch();
  };
  list.appendChild(all);
  regions.forEach(r=>{
    const el=document.createElement('div');el.className='ritem';
    el.innerHTML=`<span class="rdot" style="background:${r.color}"></span><div><div class="rname">${r.cn}</div></div>`;
    el.onclick=()=>{
      document.querySelectorAll('.ritem').forEach(e=>e.classList.remove('active'));
      el.classList.add('active');
      map.setView(g2l_curr(r.gx,r.gy),4,{animate:true});
      currentRegion=r.cn;runSearch();
    };
    list.appendChild(el);
  });
}

// ── Ray casting：判断地图坐标 (gx, gy) 落在哪个 RPOLYS 区域 ──
function pointInPoly(pts,gx,gy){
  // RPOLYS pts 是 Leaflet [lat, lng] 单位
  // 将游戏坐标 gx/gy 转换为相同单位：scale = R / 2^NZ = 12.8/32 = 0.4
  const sc=R/Math.pow(2,NZ);
  const px=gx*sc;   // lng 等效值
  const py=-gy*sc;  // lat 等效值（gy 向下为正，lat 向下为负，需取反）
  let inside=false;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const xi=pts[i][1],yi=pts[i][0]; // lng, lat
    const xj=pts[j][1],yj=pts[j][0];
    if(((yi>py)!==(yj>py))&&(px<(xj-xi)*(py-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}
function regionOfGxy(gx,gy){
  for(const rp of RPOLYS){
    if(pointInPoly(rp.pts,gx,gy))return rp.cn;
  }
  return null;
}

// ── 从 QD 的 locs 坐标自动推导任务涉及的所有区域 ──
function questRegions(qid,fallbackR){
  const q=QD[qid];if(!q)return fallbackR?[fallbackR]:[];
  const regions=new Set();
  if(q.locs&&q.locs.length){
    for(const loc of q.locs){
      const r=regionOfGxy(loc.gx,loc.gy);
      if(r)regions.add(r);
    }
  }
  // 如果坐标推导不出来（例如区域边界外），回退到手动 r 字段
  if(regions.size===0&&fallbackR&&fallbackR!=='通用')regions.add(fallbackR);
  return [...regions];
}

// ── Search ──
let currentTab='all',currentKw='';
const QENTRIES=[];
const _seen=new Set();
MD.forEach(m=>{
  if(m.tp!=='quest'||!m.qid||_seen.has(m.qid))return;
  _seen.add(m.qid);const q=QD[m.qid];if(!q)return;
  // 先尝试从 locs 坐标推导区域（无论 r 是否为'通用'）
  const derived=questRegions(m.qid,null);
  // 如果坐标推导出了具体区域，使用推导结果；否则用手动标注（含'通用'）
  const regions=derived.length>0?derived:(m.r?[m.r]:['通用']);
  const baseSearch=(q.n+' '+(q.en||'')+' '+q.s.join(' ')+' '+q.rw).toLowerCase();
  for(const reg of regions){
    QENTRIES.push({qid:m.qid,qt:m.qt||q.t,gx:m.gx,gy:m.gy,region:reg,
      search:(baseSearch+' '+reg).toLowerCase()});
  }
});
// 合并同一任务在同一区域的重复项，并按类型排序
const _dedup=new Map();
QENTRIES.forEach(e=>{
  const k=e.qid+'|'+e.region;
  if(!_dedup.has(k))_dedup.set(k,e);
});
QENTRIES.length=0;
_dedup.forEach(e=>QENTRIES.push(e));
QENTRIES.sort((a,b)=>({key:0,main:1,side:2}[a.qt]||2)-({key:0,main:1,side:2}[b.qt]||2));

function hlT(text,kw){
  if(!kw)return text;
  return text.replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),m=>`<span class="hl-match">${m}</span>`);
}

function buildLocLegend(q){
  if(!q.locs||!q.locs.length)return '';
  const typesSeen=new Set(q.locs.map(l=>l.tp));
  const LOC_LABELS={start:'接取点',key:'关键地点',end:'完成点',boss:'BOSS',dig:'挖掘点'};
  const LOC_COLORS={start:'#ff9800',key:'#4cc9f0',end:'#4ade80',boss:'#ef4444',dig:'#fbbf24'};
  const LOC_ICONS={start:'⭐',key:'📍',end:'✅',boss:'☠',dig:'⛏'};
  const items=[...typesSeen].map(tp=>{
    const col=LOC_COLORS[tp]||'#aaa';
    const em=LOC_ICONS[tp]||'📍';
    return `<span style="color:${col};font-size:11px;">${em} ${LOC_LABELS[tp]||tp}</span>`;
  }).join('<span style="color:var(--dim);margin:0 6px;">·</span>');
  return `<div style="margin-top:7px;display:flex;flex-wrap:wrap;gap:4px;align-items:center;border-top:1px solid var(--border);padding-top:7px;">${items}</div>`;
}

function runSearch(){
  const kw=currentKw.trim().toLowerCase();
  const list=document.getElementById('questList');list.innerHTML='';
  const entriesMap={island:QENTRIES,undercrown:QENTRIES_UC,dlc1:QENTRIES_DLC1,dlc2:QENTRIES_DLC2,dlc3:QENTRIES_DLC3};
  const entries=entriesMap[currentMap]||QENTRIES;
  const results=entries.filter(e=>{
    if(currentRegion&&e.region!==currentRegion&&e.region!=='通用')return false;
    if(currentTab!=='all'&&e.qt!==currentTab)return false;
    if(kw&&!e.search.includes(kw))return false;
    return true;
  });
  document.getElementById('qcount').textContent=results.length?`${results.length} 条`:'';
  if(!results.length){
    list.innerHTML=`<div class="no-results"><div class="nr-icon">🔍</div>${kw?`未找到含 <span class="nr-kw">"${kw}"</span> 的任务`:'该区域暂无任务数据'}</div>`;
    return;
  }
  results.forEach(e=>{
    const q=QD[e.qid];
    const card=document.createElement('div');
    card.className='qcard'+(activeQuestId===e.qid?' active-quest':'');
    card.id='qcard_'+e.qid;
    const bc={main:'bm',side:'bs',key:'bk'}[e.qt]||'bs';
    const tl={main:'主线',side:'支线',key:'关键'}[e.qt]||'支线';
    const hasLocs=q&&q.locs&&q.locs.length>0;
    const isActive=activeQuestId===e.qid;
    card.innerHTML=`
      <div class="qh" onclick="toggleQ(this,'${e.qid}')">
        <span class="qt ${bc}">${tl}</span>
        <span class="qn">${hlT(q?q.n:e.qid,kw)}</span>
        <span class="qa">${hlT(e.region,kw)}</span>
        ${hasLocs?`<button class="qmap-btn${isActive?' active':''}" data-mapqid="${e.qid}" onclick="event.stopPropagation();showQuestOnMap('${e.qid}')" title="在地图上显示任务地点">📍 ${isActive?'隐藏位置':'显示位置'}</button>`:''}
      </div>
      <div class="qb${(kw||isActive)?' open':''}">
        <div class="qco">📍 接取坐标: ${e.gx}°, ${e.gy}°</div>
        ${q?q.s.map(s=>`<div class="qst">${hlT(s,kw)}</div>`).join(''):''}
        ${q?`<div class="qrw">${hlT(q.rw,kw)}</div>`:''}
        ${q?buildLocLegend(q):''}
      </div>`;
    list.appendChild(card);
  });
  document.getElementById('panelTitleText').textContent=
    currentMap==='undercrown'?(currentRegion?`▸ ${currentRegion} 任务`:'▸ 地下城任务攻略'):
    (currentRegion?`▸ ${currentRegion} 任务`:'▸ 全部任务攻略');
}
function toggleQ(h,qid){h.nextElementSibling.classList.toggle('open');}
function hlCard(qid){
  const c=document.getElementById('qcard_'+qid);if(!c)return;
  c.scrollIntoView({behavior:'smooth',block:'center'});
  c.classList.add('hl');c.querySelector('.qb').classList.add('open');
  setTimeout(()=>c.classList.remove('hl'),2000);
}

// ── DLC 任务条目构建（通用）──
function buildQEntries(mdArr, mapId){
  const entries=[];
  const seen=new Set();
  mdArr.forEach(m=>{
    if(m.tp!=='quest'||!m.qid||seen.has(m.qid))return;
    seen.add(m.qid);const q=QD[m.qid];if(!q)return;
    const bs=(q.n+' '+(q.en||'')+' '+q.s.join(' ')+' '+q.rw).toLowerCase();
    entries.push({qid:m.qid,qt:m.qt||q.t,gx:m.gx,gy:m.gy,region:mapId,search:(bs+' '+mapId).toLowerCase()});
  });
  entries.sort((a,b)=>({key:0,main:1,side:2}[a.qt]||2)-({key:0,main:1,side:2}[b.qt]||2));
  return entries;
}

// ── 地下城任务条目 ──
const QENTRIES_UC=[];
const _seenUC=new Set();
MD_UC.forEach(m=>{
  if(m.tp!=='quest'||!m.qid||_seenUC.has(m.qid))return;
  _seenUC.add(m.qid);const q=QD[m.qid];if(!q)return;
  const baseSearch=(q.n+' '+(q.en||'')+' '+q.s.join(' ')+' '+q.rw).toLowerCase();
  QENTRIES_UC.push({qid:m.qid,qt:m.qt||q.t,gx:m.gx,gy:m.gy,region:'地下城',
    search:(baseSearch+' 地下城').toLowerCase()});
});
QENTRIES_UC.sort((a,b)=>({key:0,main:1,side:2}[a.qt]||2)-({key:0,main:1,side:2}[b.qt]||2));

// DLC 任务条目（延迟构建：等 buildMarkersDLC 调用后再用 buildQEntries）
let QENTRIES_DLC1=[],QENTRIES_DLC2=[],QENTRIES_DLC3=[];

// ── 地图切换 ──
// 各地图配置表
const MAP_CFG={
  island:{tile:null, bounds:[[0,0],[-384,768]], fitBounds:[[-384,0],[0,768]],
    label:'主岛', sidebarTitle:'▸ 地图区域', logoSub:'交互式地图 · 主岛全攻略',
    rawGroup:null, clusterGroup:null, regGroup:null, isMain:true},
  undercrown:{tile:null, bounds:UC_BOUNDS, fitBounds:[[-72,0],[0,112]],
    label:'地下城', sidebarTitle:'▸ 地下城区域', logoSub:'交互式地图 · 地下城',
    rawGroup:null, clusterGroup:null, regGroup:null},
  dlc1:{tile:null, bounds:DLC1_BOUNDS, fitBounds:[[-184,0],[0,352]],
    label:'冥界', sidebarTitle:'▸ 冥界区域', logoSub:'交互式地图 · 冥界',
    rawGroup:null, clusterGroup:null, regGroup:null},
  dlc2:{tile:null, bounds:DLC2_BOUNDS, fitBounds:[[-184,0],[0,376]],
    label:'末日', sidebarTitle:'▸ 末日区域', logoSub:'交互式地图 · 末日之地',
    rawGroup:null, clusterGroup:null, regGroup:null},
  dlc3:{tile:null, bounds:DLC3_BOUNDS, fitBounds:[[-96,0],[0,192]],
    label:'宠物地下城', sidebarTitle:'▸ 宠物地下城区域', logoSub:'交互式地图 · 宠物与地下城',
    rawGroup:null, clusterGroup:null, regGroup:null},
};

function switchToMap(mapId){
  if(currentMap===mapId)return;
  clearQuestMarkers();
  // 移除当前地图所有图层
  const prev=MAP_CFG[currentMap];
  if(prev.tile&&map.hasLayer(prev.tile))prev.tile.remove();
  if(prev.regGroup&&map.hasLayer(prev.regGroup))prev.regGroup.remove();
  if(currentMap==='island'){
    if(clusteringEnabled){if(map.hasLayer(clusterGroup))clusterGroup.remove();}
    else{if(map.hasLayer(rawGroup))rawGroup.remove();}
  } else {
    if(clusteringEnabled){if(prev.clusterGroup&&map.hasLayer(prev.clusterGroup))prev.clusterGroup.remove();}
    else{if(prev.rawGroup&&map.hasLayer(prev.rawGroup))prev.rawGroup.remove();}
  }
  currentMap=mapId;
  const cfg=MAP_CFG[mapId];
  // 添加新地图所有图层
  if(cfg.tile)cfg.tile.addTo(map);
  if(cfg.regGroup)cfg.regGroup.addTo(map);
  if(mapId==='island'){
    if(clusteringEnabled)clusterGroup.addTo(map);
    else rawGroup.addTo(map);
  } else {
    // 每次进入非主岛地图时，根据当前聚合状态重建对应 layer group
    const mks=markersByMap[mapId]||[];
    if(clusteringEnabled&&cfg.clusterGroup){
      cfg.rawGroup.clearLayers();
      cfg.clusterGroup.clearLayers();
      mks.forEach(mk=>cfg.clusterGroup.addLayer(mk));
      cfg.clusterGroup.addTo(map);
    } else if(cfg.rawGroup){
      if(cfg.clusterGroup)cfg.clusterGroup.clearLayers();
      cfg.rawGroup.clearLayers();
      mks.forEach(mk=>cfg.rawGroup.addLayer(mk));
      cfg.rawGroup.addTo(map);
    }
  }
  map.setMaxBounds(cfg.bounds);
  map.fitBounds(cfg.fitBounds);
  // 更新 UI
  document.querySelectorAll('.mswitch').forEach(b=>b.classList.remove('active'));
  document.getElementById('msw-'+mapId).classList.add('active');
  const isMain=mapId==='island';
  document.getElementById('filterBar').style.display=isMain?'flex':'none';
  document.getElementById('clusterToggle').style.display='flex';
  document.getElementById('topbar').classList.toggle('undercrown-mode',!isMain);
  document.getElementById('sidebarTitle').textContent=cfg.sidebarTitle;
  document.querySelector('.logo-sub').textContent=cfg.logoSub;
  currentRegion=null;
  buildRegionList();
  runSearch();
}

// ── Search events ──
const si=document.getElementById('searchInput'),sc=document.getElementById('searchClear');
si.addEventListener('input',()=>{currentKw=si.value;sc.classList.toggle('visible',currentKw.length>0);runSearch();});
si.addEventListener('keydown',e=>{if(e.key==='Escape'){si.value='';currentKw='';sc.classList.remove('visible');runSearch();}});
sc.addEventListener('click',()=>{si.value='';currentKw='';sc.classList.remove('visible');si.focus();runSearch();});
document.getElementById('searchTabs').querySelectorAll('.stab').forEach(btn=>{
  btn.addEventListener('click',()=>{document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');currentTab=btn.dataset.type;runSearch();});
});

// ── Init: 将实际对象绑定到 MAP_CFG ──
MAP_CFG.island.tile=tileMain;
MAP_CFG.island.rawGroup=rawGroup;
MAP_CFG.island.regGroup=regionBorderGroup;
MAP_CFG.undercrown.tile=tileUC;
MAP_CFG.undercrown.rawGroup=rawGroupUC;
MAP_CFG.undercrown.clusterGroup=clusterGroupUC;
MAP_CFG.undercrown.regGroup=regionLabelGroupUC;
MAP_CFG.dlc1.tile=tileDLC1;
MAP_CFG.dlc1.rawGroup=rawGroupDLC1;
MAP_CFG.dlc1.clusterGroup=clusterGroupDLC1;
MAP_CFG.dlc2.tile=tileDLC2;
MAP_CFG.dlc2.rawGroup=rawGroupDLC2;
MAP_CFG.dlc2.clusterGroup=clusterGroupDLC2;
MAP_CFG.dlc3.tile=tileDLC3;
MAP_CFG.dlc3.rawGroup=rawGroupDLC3;
MAP_CFG.dlc3.clusterGroup=clusterGroupDLC3;

// 构建所有地图的 markers 和任务条目
buildFilterBar();buildRegionList();buildMarkers();
buildMarkersUC();
buildMarkersDLC(MD_DLC1,rawGroupDLC1,g2l_dlc1);
buildMarkersDLC(MD_DLC2,rawGroupDLC2,g2l);
buildMarkersDLC(MD_DLC3,rawGroupDLC3,g2l);
QENTRIES_DLC1.push(...buildQEntries(MD_DLC1,'dlc1'));
QENTRIES_DLC2.push(...buildQEntries(MD_DLC2,'dlc2'));
QENTRIES_DLC3.push(...buildQEntries(MD_DLC3,'dlc3'));
runSearch();
