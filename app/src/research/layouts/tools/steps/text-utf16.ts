import { view } from "./bytes.ts";
import type { Transform } from "./step.ts";

export const MALE_HALF_WIDTH_GEN5 = "\u246d";
export const FEMALE_HALF_WIDTH_GEN5 = "\u246e";
const MALE_HALF_WIDTH_GEN6 = "\ue08e";
const FEMALE_HALF_WIDTH_GEN6 = "\ue08f";

// PKHeX writes the half-width ♂ and ♀ unless a character of another width is in the text.
export function halfWidth(value: string) {
  for (let i = 0; i < value.length; i++) {
    const unit = value.charCodeAt(i);
    if (unit >> 12 !== 0 && unit >> 12 !== 0xe && value[i] !== "♂" && value[i] !== "♀") return false;
  }
  return true;
}

// The Chinese games draw these from 0xE800 up, as PKHeX reads them.
const CHINESE_START = 0xe800;
const CHINESE = [
  "蛋妙蛙种子草花小火龙恐喷杰尼龟卡",
  "咪水箭绿毛虫铁甲蛹巴大蝶独角壳针",
  "蜂波比鸟拉达烈雀嘴阿柏蛇怪皮丘雷",
  "穿山鼠王多兰娜后朗力诺可西六尾九",
  "胖丁超音蝠走路臭霸派斯特球摩鲁蛾",
  "地三喵猫老鸭哥猴暴蒂狗风速蚊香蝌",
  "蚪君泳士凯勇基胡腕豪喇叭芽口呆食",
  "玛瑙母毒刺拳石隆岩马焰兽磁合一葱",
  "嘟利海狮白泥舌贝鬼通耿催眠貘引梦",
  "人钳蟹巨霹雳电顽弹椰树嘎啦飞腿郎",
  "快头瓦双犀牛钻吉蔓藤袋墨金鱼星宝",
  "魔墙偶天螳螂迷唇姐击罗肯泰鲤普百",
  "变伊布边菊化盔镰刀翼急冻闪你哈克",
  "幻叶月桂竺葵锯鳄蓝立咕夜鹰芭瓢安",
  "圆丝蛛叉字灯笼古然咩羊茸美丽露才",
  "皇毽棉长手向日蜻蜓乌沼太阳亮黑暗",
  "鸦妖未知图腾果翁麒麟奇榛佛托土弟",
  "蝎钢千壶赫狃熊圈熔蜗猪珊瑚炮章桶",
  "信使翅戴加象顿Ⅱ惊鹿犬无畏战舞娃",
  "奶罐幸福公炎帝幼沙班洛亚凤时木守",
  "宫森林蜥蜴稚鸡壮跃狼纹直冲茧狩猎",
  "盾粉莲童帽乐河橡实鼻狡猾傲骨燕鸥",
  "莉奈朵溜糖雨蘑菇斗笠懒獭过动猿请",
  "假居忍面者脱妞吼爆幕下掌朝北优雅",
  "勾魂眼那恰姆落正拍负萤甜蔷薇溶吞",
  "牙鲨鲸驼煤炭跳噗晃斑颚蚁漠仙歌青",
  "绵七夕鼬斩饭匙鳅鲶虾兵螯秤念触摇",
  "篮羽丑纳飘浮泡隐怨影诅咒巡灵彷徨",
  "热带铃勃梭雪冰护豹珍珠樱空棘爱心",
  "哑属艾欧盖固坐祈代希苗台猛曼拿儿",
  "狸法师箱蟀勒伦琴含羞苞槌城结贵妇",
  "绅蜜女帕兹潜兔随卷耳魅东施铛响坦",
  "铜镜钟盆聒噪陆尖咬不良骷荧光霓虹",
  "自舔狂远Ｚ由卢席恩骑色霏莱谢米尔",
  "宙提主暖炒武刃丸剑探步哨约扒酷冷",
  "蚀豆鸽高雉幔庞滚蝙螺钉差搬运匠修",
  "建蟾蜍投摔打包保足蜈蚣车轮精根裙",
  "野蛮鲈混流氓红倒狒殿滑巾征哭具死",
  "神棺原肋始祖破灰尘索沫栗德单卵细",
  "胞造鹅倍四季萌哎呀败轻蜘坚齿组麻",
  "鳗宇烛幽晶斧嚏几何敏捷功夫父赤驹",
  "劈司令炸雄秃丫首恶燃烧毕云酋迪耶",
  "塔赛里狐呱贺掘彩蓓洁能鞘芳芙妮好",
  "鱿贼脚铠垃藻臂枪伞咚碎黏钥朽南瓜",
  "嗡哲裴格枭狙射炽咆哮虎漾壬笃啄铳",
  "少强锹农胜虻鬃弱坏驴仔重挽滴伪睡",
  "罩盗着竹疗环智挥猩掷胆噬堡爷参性",
  "：银伴陨枕戈谜拟Ｑ磨舵鳞杖璞・鸣",
  "哞鳍科莫迦虚吾肌费束辉纸御机夏蛋",
  "妙蛙種子草花小火龍恐噴傑尼龜卡咪",
  "水箭綠毛蟲鐵甲蛹巴大蝶獨角殼針蜂",
  "波比鳥拉達烈雀嘴阿柏蛇怪皮丘雷穿",
  "山鼠王多蘭娜后朗力諾可西六尾九胖",
  "丁超音蝠走路臭霸派斯特球摩魯蛾地",
  "三喵貓老鴨哥猴爆蒂狗風速蚊香蝌蚪",
  "君泳士凱勇基胡腕豪喇叭芽口呆食瑪",
  "瑙母毒刺拳石隆岩馬焰獸磁合一蔥嘟",
  "利海獅白泥舌貝鬼通耿催眠貘引夢人",
  "鉗蟹巨霹靂電頑彈椰樹嘎啦飛腿郎快",
  "頭瓦雙犀牛鑽吉蔓藤袋墨金魚星寶魔",
  "牆偶天螳螂迷唇姐擊羅肯泰鯉暴普百",
  "變伊布邊菊化盔鐮刀翼急凍閃你哈克",
  "幻葉月桂竺葵鋸鱷藍立咕夜鷹芭瓢安",
  "圓絲蛛叉字燈籠古然咩羊茸美麗露才",
  "皇毽棉長手向日蜻蜓烏沼太陽亮黑暗",
  "鴉妖未知圖騰果翁麒麟奇榛佛托土弟",
  "蠍鋼千壺赫狃熊圈熔蝸豬珊瑚炮章桶",
  "信使翅戴加象頓Ⅱ驚鹿犬無畏戰舞娃",
  "奶罐幸福公炎帝幼沙班洛亞鳳時木守",
  "宮森林蜥蜴稚雞壯躍狼紋直衝繭狩獵",
  "盾粉蓮童帽樂河橡實鼻狡猾傲骨燕鷗",
  "莉奈朵溜糖雨蘑菇斗笠懶獺過動猿請",
  "假居忍面者脫妞吼幕下掌朝北優雅勾",
  "魂眼那恰姆落正拍負螢甜薔薇溶吞牙",
  "鯊鯨駝煤炭跳噗晃斑顎蟻漠仙歌青綿",
  "七夕鼬斬飯匙鰍鯰蝦兵螯秤念觸搖籃",
  "羽醜納飄浮泡隱怨影詛咒巡靈彷徨熱",
  "帶鈴勃梭雪冰護豹珍珠櫻空棘愛心啞",
  "屬艾歐蓋固坐祈代希苗台猛曼拿兒狸",
  "法師箱蟀勒倫琴含羞苞槌城結貴婦紳",
  "蜜女帕茲潛兔隨捲耳魅東施鐺響坦銅",
  "鏡鐘盆聒噪陸尖咬不良骷光霓虹自舔",
  "狂遠Ｚ由盧席恩騎色霏萊謝米爾宙提",
  "主暖炒武刃丸劍探步哨約扒酷冷蝕豆",
  "鴿高雉幔龐滾蝙螺釘差搬運匠修建蟾",
  "蜍投摔打包保足蜈蚣車輪毬精根裙野",
  "蠻鱸混流氓紅倒狒殿滑巾徵哭具死神",
  "棺原肋始祖破灰塵索沫栗德單卵細胞",
  "造鵝倍四季萌哎呀敗輕蜘堅齒組麻鰻",
  "宇燭幽晶斧嚏幾何敏捷功夫父赤駒劈",
  "司令炸雄禿丫首惡燃燒畢雲酋迪耶塔",
  "賽里狐呱賀掘彩蓓潔能鞘芳芙妮好魷",
  "賊腳鎧垃藻臂槍傘咚碎黏鑰朽南瓜嗡",
  "哲裴格梟狙射熾咆哮虎漾壬篤啄銃少",
  "強鍬農勝虻鬃弱壞驢仔重挽滴偽睡罩",
  "盜著竹療環智揮猩擲膽噬堡爺參性：",
  "銀伴隕枕戈謎擬Ｑ磨舵鱗杖璞・鳴哞",
  "鰭科莫迦虛吾肌費束輝紙御機夏垒磊",
  "砰奥壘磊砰丑奧",
].join("");

interface Options {
  terminator: number;
  male: string;
  female: string;
  chinese?: boolean;
}

function utf16({ terminator, male, female, chinese }: Options): Transform<string, Record<string, never>> {
  const character = (unit: number) => {
    if (chinese && unit >= CHINESE_START && unit - CHINESE_START < CHINESE.length) return CHINESE[unit - CHINESE_START];
    const char = String.fromCharCode(unit);
    return char === male ? "♂" : char === female ? "♀" : char;
  };
  const decode = (input: Uint8Array) => {
    const data = view(input);
    let decoded = "";
    for (let at = 0; at + 1 < input.length; at += 2) {
      const unit = data.getUint16(at, true);
      if (unit === terminator || unit === 0) break;
      decoded += character(unit);
    }
    return decoded;
  };
  return {
    kind: "transform",
    decode,
    encode(value, _, previous) {
      // Text the bytes already hold keeps them, since a table can read two values as one character.
      if (decode(previous) === value) return previous.slice();
      if (value.length * 2 > previous.length) throw new Error(`"${value}" is longer than ${previous.length / 2} characters`);
      const encoded = new Uint8Array(previous.length);
      const data = view(encoded);
      const half = halfWidth(value);
      for (let i = 0; i < value.length; i++) {
        const unit = value.charCodeAt(i);
        if (unit === terminator || unit === 0) throw new Error(`text can't hold U+${unit.toString(16).toUpperCase().padStart(4, "0")}, which ends it`);
        const char = value[i];
        data.setUint16(i * 2, (half && char === "♂" ? male : half && char === "♀" ? female : char).charCodeAt(0), true);
      }
      if (value.length * 2 + 1 < encoded.length) data.setUint16(value.length * 2, terminator, true);
      return encoded;
    },
  };
}

export const textGen5 = utf16({ terminator: 0xffff, male: MALE_HALF_WIDTH_GEN5, female: FEMALE_HALF_WIDTH_GEN5 });
export const textGen6 = utf16({ terminator: 0, male: MALE_HALF_WIDTH_GEN6, female: FEMALE_HALF_WIDTH_GEN6 });
export const textGen7 = utf16({ terminator: 0, male: MALE_HALF_WIDTH_GEN6, female: FEMALE_HALF_WIDTH_GEN6, chinese: true });
