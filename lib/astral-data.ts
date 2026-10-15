import storyPosts from './astral-story-posts.json';
import {extraRows} from './astral-extra';
import roster from './astral-characters.json';
export const characters = roster;
export type Character = typeof characters[number];
export const regions = [
  {id:'herta',start:0,name:'헤르타 우주정거장',en:'HERTA SPACE STATION',short:'우주정거장',color:'#ad9deb',icon:'◈',description:'별을 관측하는 사람들, 그리고 조금 별난 연구 기록.',phases:['군단 습격 이후','시뮬레이션 우주 연구','열차 출발 준비']},
  {id:'belobog',start:3,name:'벨로보그',en:'BELOBOG',short:'벨로보그',color:'#8ecde0',icon:'❄',description:'눈 덮인 도시에도, 사람들의 이야기는 따뜻하게 남는다.',phases:['행정구 첫 방문','하층구에서의 동행','상하층구 재연결 이후']},
  {id:'luofu',start:6,name:'선주 나부',en:'THE XIANZHOU LUOFU',short:'선주 나부',color:'#83cbb6',icon:'◇',description:'별바다를 건너는 선주에서 전해 온 안부.',phases:['나부 입항','스텔라론 사태 대응','사태 수습과 배웅']},
  {id:'penacony',start:10,name:'페나코니',en:'PENACONY',short:'페나코니',color:'#dfb5e8',icon:'✧',description:'좋은꿈의 불빛 아래, 아직 전하지 못한 이야기.',phases:['황금의 순간 첫 방문','꿈의 진실을 마주할 때','축제 사건 이후']},
  {id:'amphoreus',start:16,name:'앰포리어스',en:'AMPHOREUS',short:'앰포리어스',color:'#e6cb8a',icon:'☼',description:'영원의 땅에서 함께 써 내려가는 불을 쫓는 여정.',phases:['황금의 후예와 첫 만남','오크마 체류','불씨 여정 초입']},
  {id:'planarcadia',start:19,name:'이상 낙원',en:'PLANARCADIA',short:'이상 낙원',color:'#e99bba',icon:'✺',description:'웃음과 소문이 교차하는 도시. 다음 이야기는 어디로?',phases:['낙원에 첫발을','도시 탐색','환월 게임을 앞두고']},
];
const timeline:[string,string][]=[
 ['herta','군단 습격 이후'],['herta','시뮬레이션 우주 연구'],['herta','열차 출발 준비'],
 ['belobog','행정구 첫 방문'],['belobog','하층구에서의 동행'],['belobog','상하층구 재연결 이후'],
 ['luofu','나부 입항'],['luofu','스텔라론 사태 대응'],['luofu','사태 수습과 배웅'],
 ['herta','우주정거장 재방문 · 1.6'],
 ['penacony','황금의 순간 첫 방문 · 2.0'],['penacony','꿈의 진실 · 2.2'],['penacony','축제 사건 이후 · 2.3'],
 ['luofu','연무의식 시기 · 2.4~2.5'],['penacony','페나코니 재방문 · 2.6'],['luofu','다시 잇는 인연 · 2.7'],
 ['amphoreus','오크마와 여정의 시작 · 3.0'],['amphoreus','여정 중의 기록 · 3.2~3.4'],['amphoreus','후반 기억 아카이브 · 3.7'],
 ['planarcadia','낙원에 첫발을 · 4.0'],['planarcadia','도시 탐색 · 4.0'],['planarcadia','환월 게임을 앞두고 · 4.0'],
];
export const checkpoints=timeline.map(([region,phase],at)=>({at,region,label:`${regions.find(r=>r.id===region)!.name} · ${phase}`}));
export const memeNames:Record<string,string>={M01:'쓰레기통 집착',M02:'은하 방망이 협객',M03:'빙글뱅글 · 쿠루쿠루',M04:'더 많은 헤르타!',M05:'길치 아케론',M06:'게파드의 그림 실력',M07:'청작의 월급 루팡',M08:'부트힐의 순화된 욕설'};
export const characterById=(id:string)=>id==='__admin__'?{id:'__admin__',name:'게시판의 에이온즈',image:'/favicon.svg',group:'관리자',aliases:[],key:'admin',source:''}:characters.find(c=>c.id===id);
export type Seed={id:string;character:string;region:string;at:number;title:string;body:string;memes:string[];source:string};
const rows:[string,string,number,string,string,string[]?][]=[
 ["signal-001", "Asta", 0, "복구 보고보다 먼저 확인할 것", "연구원들은 다들 무사해? 장비 손실은 정리해서 보내 줘. 다친 사람은 보고서 쓰기 전에 의료 구역부터 가고. 오늘은 그게 가장 중요한 업무야."],
 ["signal-002", "March_7th", 0, "오늘 사진은 조금 흔들렸지만", "정거장에 오자마자 이렇게 바쁠 줄은 몰랐지! 사진이 죄다 흔들렸어. 그래도 다들 무사히 나온 사진은 남았으니까, 이건 지우지 않을래."],
 ["signal-003", "Herta", 1, "연구 참가자에게: 회전 요청은 접수 안 해", "실험 기록을 보내랬더니 인형이 몇 번 돌았는지만 세고 있네. 빙글뱅글은 충분히 봤잖아. 다음에는 네가 어떤 선택을 했는지 적어 와. 그쪽이 더 흥미로우니까.", ["M03"]],
 ["signal-005", "Herta", 2, "인형 추가 배치 요청에 관해서", "더 많은 헤르타가 필요하다고? 좋아. 그럼 내가 늘어난 만큼 네 실험 일정도 늘리면 되겠네. 갑자기 조용해진 걸 보니 충분한가 봐.", ["M04"]],
 ["signal-006", "Himeko", 2, "다음 정차를 기다리며", "열차에 오르기 전, 이곳에서 도와준 사람들에게 인사를 전해 줘. 긴 여행은 그런 작은 작별에서 시작되기도 하니까. 돌아오면 따뜻한 것을 준비해 둘게."],
 ["signal-007", "Gepard", 3, "행정구 순찰 안내", "방문객 여러분, 통제 구역에는 들어가지 말아 주십시오. 길을 모르신다면 순찰 중인 철위대에 문의하시면 됩니다. 눈이 쌓인 계단에서는 특히 조심해 주십시오."],
 ["signal-009", "Seele", 4, "볼더 타운에 처음 온 사람들에게", "길을 모르겠으면 물어봐. 위험한 골목에 혼자 들어가 놓고 괜찮다고 버티지는 말고. 일손을 보태겠다면 환영이야. 대신 쉬어야 하는 사람한테까지 무리시키지 마."],
 ["signal-010", "Natasha", 4, "진료소 문은 열려 있어요", "통증을 참는다고 일이 더 빨리 끝나지는 않아요. 돌아오는 길에 들러 주세요. 약이 필요한 분은 증상을 먼저 말씀해 주시고요. 다른 사람에게 받은 처방을 그대로 따라 드시면 안 돼요."],
 ["signal-011", "Bronya", 5, "다시 연결된 길에서", "길이 열렸다고 서로의 삶까지 곧바로 이해하게 되는 건 아니겠지. 그래서 더 자주 듣고, 직접 확인하려고 해. 필요한 것과 아직 바뀌지 않은 것을 알려 줘. 답을 서두르기보다 제대로 시작하고 싶어."],
 ["signal-012", "Gepard", 5, "안내도 초안을 검토 부탁드립니다", "상하층구를 오가는 방문객을 위한 안내도입니다. 동료들이 광장 표시를 알아보기 어렵다고 해서 의견을 구합니다. 가운데 그림은 분수입니다. 폭발하는 난방기는 아닙니다.", ["M06"]],
 ["signal-013", "Qingque", 6, "처음 오셨다면 천천히 둘러보세요", "급하게 구경하면 나중에 또 와야 하잖아요? 천천히 보고, 틈틈이 쉬고. 아, 저는 오늘 맡은 일은 끝냈어요. 쉬는 시간을 연구 중이라고 해 두죠.", ["M07"]],
 ["signal-014", "March_7th", 6, "별바다를 항해하는 배라니!", "분명 배 위라고 했는데 거리가 이렇게 넓어도 되는 거야? 사진 찍을 곳이 너무 많아. 단항한테 보여 줄 사진도 잘 골라 둬야지. 먼저 길부터 잃지 말고!"],
 ["signal-015", "Fu_Xuan", 7, "추측을 보고로 올리지 말도록", "확인한 사실과 들은 소문을 구분해 제출하세요. 같은 소문을 열 사람이 말한다고 증거가 열 개가 되지는 않죠. 불확실한 부분은 본좌가 다시 살피겠습니다."],
 ["signal-016", "Jing_Yuan", 7, "잠시 쉬어 갈 자리를 남겨 두게", "급한 일일수록 사람까지 소모해서는 곤란하지. 교대를 마친 운기군은 먼저 쉬도록. 보고는 내가 읽겠네. 쉬라는 명령까지 협상할 필요는 없겠지?"],
 ["signal-017", "Qingque", 8, "복귀 보고: 할 일은 했습니다", "미뤄 둔 정리는 끝냈고, 전달할 기록도 다 넘겼어요. 그러니까 이제 쉬어도 되겠죠? 내일 할 일을 미리 당겨 하면 내일의 제가 너무 한가해질 것 같아서요.", ["M07"]],
 ["signal-018", "Jing_Yuan", 8, "다음 방문에는 조금 덜 바쁘기를", "이번에는 충분히 둘러볼 겨를이 없었겠군. 다음에 올 때는 좋은 차를 마실 시간을 남겨 두게. 배웅은 여기서 하겠네. 그대들의 앞길이 평안하기를."],
 ["signal-019", "Firefly", 9, "황금의 순간에서 잠깐 쉬어 갈래?", "사람이 많은 곳을 조금 벗어나면 조용히 앉을 자리도 있어. 하루 종일 걷기만 하면 피곤하잖아. 네가 괜찮다면, 다음 길은 조금 천천히 가고 싶어."],
 ["signal-020", "Acheron", 9, "호텔 로비로 가는 길", "안내해 준 사람에게 고맙다는 말을 남기고 싶어. 같은 복도로 돌아온 건… 네 설명이 잘못돼서가 아니야. 이번에는 갈림길을 적어 두겠어.", ["M05"]],
 ["signal-021", "Welt", 10, "확인되지 않은 소식은 잠시 멈춰 주게", "서로 다른 증언이 있다고 해서 어느 하나를 곧바로 버릴 수는 없네. 각자 어디에서 무엇을 보았는지부터 정리해 보세. 판단은 그다음에도 늦지 않을 거야."],
 ["signal-022", "Himeko", 10, "혼자 답을 찾으려 하지 않아도 돼", "모든 것을 한 번에 설명할 수 없을 때도 있지. 그래도 함께 생각할 사람은 있어. 돌아오면 네가 본 것부터 들려줘. 우리도 여기서 준비하고 있을게."],
 ["signal-023", "Robin", 11, "무대 밖에서 보내는 인사", "큰 무대가 끝난 뒤에도 여러분의 하루는 이어지겠지요. 오늘은 가까운 분의 이야기를 조금 더 들어 보면 어떨까요? 저도 노래하지 않는 시간의 목소리를 기억하고 싶어요."],
 ["signal-024", "Boothill", 11, "이 통신기 말투 좀 어떻게 해 봐", "고장 난 게 아니라고? 그럼 내가 화를 낼 때마다 왜 이렇게 앙증맞은 말이 나오는데! 웃는 건 좋은데, 수리할 줄 아는 녀석부터 좀 불러 줘.", ["M08"]],
 ["signal-025", "Phainon", 12, "낯선 길을 함께 걷는 분들께", "처음 보는 풍경이 많으실 거예요. 서두르지 않으셔도 됩니다. 필요한 것이 있다면 말씀해 주세요. 오늘은 제가 앞서 걸으며 길을 안내하겠습니다."],
 ["signal-026", "Aglaea", 12, "오크마에서 머무르는 동안", "멀리서 오신 손님들이 잠시 숨을 고를 자리를 마련했습니다. 이곳에서 지켜야 할 것들도 차근차근 알려 드리지요. 서로를 이해하는 데에는 시간이 필요하니까요."],
 ["signal-027", "March_7th", 13, "열차에서 사진 기다리는 중!", "그쪽 풍경은 어때? 설명만 들으면 자꾸 상상이 더 커지잖아. 안전할 때 사진 한 장만 보내 줘. 너무 멋진 곳이면 조금 부러워할 수도 있고!"],
 ["signal-028", "Phainon", 13, "작은 부탁 하나만 드려도 될까요", "오늘 함께 걸었던 길을 지도에 표시하고 있어요. 제가 놓친 골목이 있다면 알려 주시겠어요? 다음에 이곳을 찾을 누군가가 조금 덜 헤매면 좋겠습니다."],
 ["signal-029", "Aglaea", 14, "출발 전 다시 확인할 것들", "여정을 떠나는 분들은 보급과 귀환 연락을 확인해 주세요. 뜻이 굳다는 이유만으로 준비가 대신되는 것은 아니니까요. 기다리는 이들에게도 소식을 남겨 주시길 바랍니다."],
 ["signal-031", "Himeko", 15, "새로운 세계에 도착한 승객들에게", "낯선 곳에서는 시선을 끄는 것이 많지. 돌아올 길과 연락할 방법부터 기억해 두렴. 흥미로운 이야기를 만나면, 열차에서도 들을 수 있게 남겨 주고."],
 ["signal-033", "Himeko", 16, "오늘의 여행 기록을 기다릴게", "눈에 띄는 풍경도 좋지만, 그곳에서 만난 사람의 이야기도 궁금하네. 즐거워 보이는 얼굴 뒤에 어떤 하루가 있었는지. 여유가 된다면 한 번쯤 들어 봐도 좋겠지."],
 ["signal-035", "Himeko", 17, "떠들썩할수록 연락은 짧고 분명하게", "누가 무엇을 제안했는지, 네가 어디에 있는지부터 알려 줘. 재미있는 이야기와 중요한 약속은 따로 기억해 두는 게 좋겠네. 판단이 어려우면 함께 생각하자."],
];
const firstPosts:Seed[]=rows.map(([id,key,at,title,body,memes=[]])=>{
 const c=characters.find(c=>c.key===key && (key!=='Trailblazer'||c.id==='8002'))!;
 const mapped=at<9?at:at<=11?at+1:at<=14?16:at+4;
 return {id,character:c.id,region:regions[Math.floor(at/3)].id,at:mapped,title,body,memes,source:c.source};
});
export const seedPosts:Seed[]=[...storyPosts,...firstPosts,...extraRows.map(([key,region,at,title,body])=>{const c=characters.find(c=>c.id===key||c.key===key)!;return {id:`profile-${c.id}`,character:c.id,region,at,title,body,memes:[],source:c.source};})];
export type Post = Seed & {created:number;likes:number;comments:number;seeded:number;owned:boolean};
export type Comment={id:string;character:string;body:string;created:number;owned:boolean};
export type Visitor={character:string;admin?:boolean};
