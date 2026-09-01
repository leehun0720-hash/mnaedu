import { desc, eq, inArray, and } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/db";
import { questions } from "@/db/schema";

/** The firm's practice areas. The two closed ones never carry questions. */
export const TRACKS = [
  { slug: "friendly", label: "우호적 M&A" },
  { slug: "hostile", label: "적대적 M&A · 경영권 분쟁" },
  { slug: "control", label: "경영권 투자" },
] as const;

export const FORMATS = ["주관식", "객관식"] as const;
export type Format = (typeof FORMATS)[number];

/** What the public page renders. The answer is not in here. */
export type PublicQuestion = {
  id: number;
  no: number;
  trackLabel: string;
  type: string;
  prompt: string;
  choices?: string[];
};

/** Served only to a signed-in member, from a separate request. */
export type QuestionAnswer = {
  id: number;
  answer: string;
  explanation: string;
};

export function trackLabel(slug: string): string {
  return TRACKS.find((t) => t.slug === slug)?.label ?? slug;
}

/**
 * Shown until the chairman has published questions of his own, so the page
 * never renders an empty section — including on the first deploy, before a
 * database exists. Ids are negative so they can never collide with real rows.
 */
const SEED: (PublicQuestion & QuestionAnswer)[] = [
  {
    id: -1,
    no: 1,
    trackLabel: "우호적 M&A",
    type: "주관식",
    prompt:
      "제조업 비상장사 매각 건이다. 매출은 연 900억, 하반기에 매출이 몰리는 계절성이 뚜렷하고 운전자본이 분기마다 100억 이상 흔들린다. 매도인은 직전 결산일을 기준일로 한 Locked-Box를, 매수인은 Closing Accounts를 요구한다. 선행조건에 기업결합신고가 걸려 있어 클로징까지 4~6개월이 예상된다. 어느 구조를 택하고, 택한 구조에서 반드시 계약에 박아야 할 조항은 무엇인가.",
    answer:
      "기준 재무제표가 외부감사를 받았다면 Locked-Box를 택한다. 대신 Leakage를 '금지 유출'과 '허용 유출'로 나눠 열거하고, 금지 유출은 상한·바스켓 없이 1:1 전액 배상으로 못 박는다. 기준일부터 클로징까지의 기간에 대해서는 일할 이자(Equity Ticker)를 매도인에게 주되, 그 기간의 사업 위험은 매수인이 진다는 점을 명시한다. 감사받은 기준 재무제표가 없거나 기준일 이후 사업이 크게 흔들릴 여지가 있으면 Closing Accounts로 가고, 정산 대상을 순차입금과 목표 운전자본 두 축으로 한정한다. 이때 회계처리 서열(계약 별첨 회계정책 > 대상회사 과거 관행 > 일반 회계기준)과 독립 회계사의 최종 결정 조항, 산정 기한을 함께 넣는다.",
    explanation:
      "두 방식의 차이는 가격 산식이 아니라 '기준일 이후의 사업 위험을 누가 지는가'와 '분쟁을 어디서 끝내는가'다. 계절성이 큰 회사에서 Closing Accounts를 택하면 클로징 날짜가 곧 가격이 되고, 목표 운전자본을 12개월 평균으로 잡을지 동월 기준으로 잡을지에서 수십억이 갈린다. Locked-Box를 택했다면 승부는 Leakage 정의 문언 하나로 끝난다. 배당·상여·특수관계자 거래·매도인 자문료를 어느 칸에 넣느냐를 협상 초반에 표로 합의해두지 않으면 사인 직전에 딜이 멈춘다. 정산 분쟁은 대부분 조항이 아니라 절차의 부재에서 나온다.",
  },
  {
    id: -2,
    no: 2,
    trackLabel: "우호적 M&A",
    type: "주관식",
    prompt:
      "실사 마지막 주에 대상회사의 하도급 대금 정산과 연장근로 수당에서 과거 3년치 미지급 이슈가 발견됐다. 노출 규모는 40억에서 120억 사이로 추정되며, 감독기관 조사가 시작될지 여부는 불확실하다. 매도인은 '가격은 못 깎는다, 진술보장으로 커버하겠다'는 입장이고, 매수인 측은 W&I 보험을 검토하자고 한다. 어떻게 설계하겠는가.",
    answer:
      "이 건은 진술보장으로 커버되지 않는다. 실사에서 이미 발견돼 공개목록(Disclosure Schedule)에 오르는 순간 진술보장 위반이 성립하지 않고, W&I 보험도 알려진 위험은 담보에서 제외한다. 따라서 진술보장이 아니라 특별보상(Specific Indemnity)으로 분리해 별도 조항을 만든다. 특별보상은 일반 보상의 상한·바스켓·최소청구금액 적용을 받지 않게 하고, 추정 노출의 중간값 수준을 별도 에스크로에 예치한다. 존속기간은 계약상 3년 같은 임의 기간이 아니라 관련 청구권의 소멸시효와 조사 종결 시점에 연동시키고, 방어권과 화해 동의권을 누가 갖는지까지 조항에 넣는다.",
    explanation:
      "실무자가 가장 많이 틀리는 지점이 '알려진 위험'과 '알려지지 않은 위험'의 구분이다. 진술보장과 보험은 후자를 위한 도구고, 전자는 가격·특별보상·조건부 대가 셋 중 하나로만 처리된다. 여기서 갈리는 건 금액이 아니라 방어권이다. 조사 대응과 화해 권한을 매도인이 쥐면 매수인은 회사를 인수한 뒤에도 자기 회사의 노무 리스크를 남의 판단에 맡기게 된다. 에스크로도 금액보다 해제 조건이 중요하다. '3년 경과'가 아니라 '조사 종결 또는 시효 완성'으로 걸어야 실제로 돈이 남는다.",
  },
  {
    id: -3,
    no: 3,
    trackLabel: "적대적 M&A · 경영권 분쟁",
    type: "주관식",
    prompt:
      "시가총액 3,000억 규모 상장사의 경영권을 노린다. 최대주주 측 지분은 우호지분 포함 22%, 나머지는 기관과 개인에 분산돼 있다. 의뢰인은 '보고 전까지 최대한 조용히 모으고 싶다'고 한다. 5% 룰을 전제로 매집 단계를 어떻게 설계하고, 무엇을 하지 않겠는가.",
    answer:
      "먼저 하지 않을 것을 정한다. 차명 계좌, 지분 파킹, 공동보유 관계를 숨긴 분산 매수는 설계 대상이 아니라 배제 대상이다. 발각되면 의결권이 제한되고 처분 명령까지 갈 수 있으며, 무엇보다 표대결에서 상대에게 프레임을 통째로 넘겨준다. 합법 구간에서의 설계는 세 가지다. 첫째, 5% 미만 구간에서 자기 계정으로 시장 충격을 최소화하며 모으고 유동성이 부족하면 장외·블록으로 확보한다. 둘째, 자문사·공동투자자와의 합의가 어디서부터 공동보유에 해당하는지를 미리 문서로 정리해둔다. 셋째, 5% 도달 시점이 아니라 보고 이후 냉각기간이 끝나는 시점을 역산해, 그때 이미 임시주총 소집과 위임장 조직이 가동될 수 있도록 준비를 끝내둔다.",
    explanation:
      "매집의 승부는 지분율이 아니라 시간표에서 갈린다. 보고 의무가 발생하면 5일 내 보고, 경영참가 목적이면 보고일로부터 추가 취득과 의결권 행사가 일정 기간 묶인다. 이 구간에 상대는 우호지분 확보와 방어 발행을 준비한다. 즉 공시는 우리가 조용해지는 시점이 아니라 상대가 움직이기 시작하는 신호탄이다. 실무에서 가장 자주 무너지는 지점은 공동보유자 판단이다. 지분을 나눠 들었더라도 의결권 행사에 관한 합의가 있으면 합산 대상이 되고, 이 판단을 늦게 하면 이미 낸 보고서 자체가 흠결이 된다. 우리가 화이트북에 이 단계의 날짜와 판단 근거를 남기는 이유도 여기에 있다.",
  },
  {
    id: -4,
    no: 4,
    trackLabel: "경영권 투자",
    type: "주관식",
    prompt:
      "연 매출 400억, 영업이익 45억인 부품사에 경영권 투자를 집행했다. 구주 55%를 인수하고 창업자가 30%로 남아 대표이사를 계속 맡는다. 클로징 다음 날부터 100일 동안 무엇을, 어떤 순서로 할 것인가. 우선순위와 이유를 쓰라.",
    answer:
      "클로징 당일에 끝내야 할 것과 100일 안에 할 것을 먼저 분리한다. 이사회 재구성, 정관 변경, 대표이사·감사 선임, 법인 인감과 계좌 권한, 전자결재 승인 한도 재설정은 클로징과 동시에 끝낸다. 이걸 '나중에 협의'로 미루면 지배권은 서류에만 남는다. 이후 30일 안에 자금 통제와 특수관계자 거래를 전수 조사해 정리하고, 60일 안에 원가와 단가 구조를 제품·거래처 단위로 다시 깐다. 90일까지 창업자와 핵심 인력의 리텐션·경업금지 조건을 확정하고, 월간 보고 양식과 KPI를 문서로 고정한다. 100일 시점에는 투자 검토 당시의 가정과 실제 숫자를 대조한 기록을 남긴다.",
    explanation:
      "경영권 투자에서 손실은 대개 가격이 아니라 인수 이후 90일에서 발생한다. 권한 재배치를 클로징과 분리하는 순간, 창업자는 여전히 실질 경영자이고 투자자는 대주주일 뿐인 상태가 몇 달씩 이어진다. 순서도 중요하다. 원가 구조를 먼저 건드리면 조직이 반발하고, 자금 통제를 먼저 잡으면 반발할 수단 자체가 줄어든다. 특수관계자 거래는 실사에서 잡히지 않다가 인수 후에 드러나는 대표적 항목이라 초기에 전수로 봐야 한다. 그리고 100일 기록을 남기지 않으면, 2년 뒤 성과가 나빠졌을 때 원인이 인수 전 문제였는지 인수 후 운영 문제였는지 아무도 증명하지 못한다.",
  },
  {
    id: -5,
    no: 5,
    trackLabel: "적대적 M&A · 경영권 분쟁",
    type: "객관식",
    prompt:
      "지분 9%를 확보하고 경영참가 목적을 공시한 직후, 대상회사 이사회가 '신규 사업 자금 조달'을 이유로 발행주식의 20%에 해당하는 신주를 우호적 제3자에게 배정하기로 결의했다. 배정가는 시가 대비 상당한 할인이고, 납입일은 2주 뒤다. 인수 측이 가장 먼저 취해야 할 조치는?",
    choices: [
      "언론에 이사회를 비판하는 성명을 내고 소액주주 여론전을 먼저 시작한다",
      "신주 배정을 받은 제3자에게 프리미엄을 제시해 해당 물량을 인수하는 협상을 시도한다",
      "자금 조달의 실제 필요성과 발행조건을 사실관계로 재구성해, 방어 목적의 우열과 수단의 비례성을 다투는 논거를 세우고 납입일 전 효력을 정지시키는 절차를 준비한다",
      "희석에 대응해 장내에서 지분을 추가 매집해 지분율을 원상 회복시킨다"
    ],
    answer:
      "정답은 세 번째다. 승부는 납입일 전에 결정된다. 납입 전에는 발행 자체를 다투지만, 납입이 끝나면 이미 유통된 주식의 효력을 되돌리는 훨씬 어려운 싸움이 된다. 따라서 자금 소요의 실재성, 조달 방식 비교 검토 여부, 배정 상대방과 경영진의 관계, 할인율의 근거를 2주 안에 사실관계로 정리해 제출 가능한 형태로 만든다. 동시에 그 자료를 기관투자자 설득용으로도 쓴다.",
    explanation:
      "국내 법규에는 경영권 방어 목적의 신주 발행을 어떤 기준으로 심사할지에 대한 정교한 명문 규정이 없다. 델라웨어에서는 이런 국면에 일반적인 경영판단 존중이 그대로 적용되지 않고, 위협의 실재성과 대응 수단의 비례성을 이사회가 먼저 소명하도록 하는 강화된 심사 틀이 오랜 판례로 축적돼 있다. 우리가 하는 일은 그 틀을 사실관계에 씌워 논거의 밀도를 올리는 것이다. 나머지 선택지가 나쁜 이유는 분명하다. 여론전을 먼저 하면 협상 카드를 잃고, 제3자 물량 매입은 상대의 방어를 사후에 정당화해준다. 장내 추가 매집은 자금과 시간을 쓰고도 20% 희석을 따라잡지 못하며, 목적 공시 이후의 취득 제한 구간과 충돌할 수도 있다.",
  },
  {
    id: -6,
    no: 6,
    trackLabel: "경영권 투자",
    type: "객관식",
    prompt:
      "창업자와 60 대 40으로 지분을 나눠 갖는 경영권 투자 구조를 협의 중이다. 창업자는 대표이사로 3년간 잔류하고, 3년 뒤 잔여 지분에 대한 정산을 예정하고 있다. 텀시트에서 가장 먼저 확정해야 하는 항목은?",
    choices: [
      "3년 뒤 잔여 지분 콜옵션의 행사가격 산식과 EBITDA 배수",
      "이사회 구성, 주주총회·이사회 유보사항, 그리고 교착상태 해소 절차",
      "창업자의 보수 수준과 성과급 지급 기준",
      "향후 상장 추진 시점과 주관사 선정 기준"
    ],
    answer:
      "정답은 두 번째다. 60%는 보통결의를 통과시키지만 특별결의는 통과시키지 못한다. 정관 변경, 중요한 영업 양수도, 합병처럼 회사의 구조를 바꾸는 결정에는 출석 주주 3분의 2 이상의 동의가 필요해, 40%를 쥔 상대가 단독으로 막을 수 있다. 따라서 어떤 사항을 이사회 유보사항으로 둘지, 교착이 생기면 무엇으로 푸는지를 가격보다 먼저 정해야 한다.",
    explanation:
      "경영권 투자에서 '과반 확보'라는 말은 실제 권한을 설명하지 못한다. 일상 경영과 구조 변경은 다른 정족수 위에 있고, 그 사이 공백이 그대로 교착으로 이어진다. 교착 해소 장치가 없으면 갈등이 시작된 날부터 회사는 의사결정을 멈추고, 그 상태가 6개월만 이어져도 기업가치가 먼저 훼손된다. 콜옵션 산식은 중요하지만 그 자체로는 교착을 풀지 못하고, 오히려 유보사항과 드래그·태그 조항이 정해져야 산식이 의미를 갖는다. 보수와 상장 계획은 지배구조가 확정된 뒤에 붙는 항목이다. 순서를 뒤집은 텀시트가 2년 뒤 분쟁으로 돌아오는 경우를 우리는 반복해서 봐왔다.",
  },
];

/** Questions for the public page — answers deliberately absent. */
export async function getPublicQuestions(limit = 6): Promise<PublicQuestion[]> {
  // Build the public shape by naming the fields that may be sent, rather than
  // by removing the ones that may not — an added secret field then defaults
  // to withheld instead of leaking.
  const strip = (q: (typeof SEED)[number]): PublicQuestion => ({
    id: q.id,
    no: q.no,
    trackLabel: q.trackLabel,
    type: q.type,
    prompt: q.prompt,
    ...(q.choices ? { choices: q.choices } : {}),
  });
  if (!isDbConfigured()) return SEED.slice(0, limit).map(strip);
  try {
    const rows = await getDb()
      .select({
        id: questions.id,
        track: questions.track,
        format: questions.format,
        prompt: questions.prompt,
        choices: questions.choices,
      })
      .from(questions)
      .where(eq(questions.published, true))
      .orderBy(desc(questions.createdAt))
      .limit(limit);

    if (rows.length === 0) return SEED.slice(0, limit).map(strip);

    return rows.map((r, i) => ({
      id: r.id,
      no: i + 1,
      trackLabel: trackLabel(r.track),
      type: r.format,
      prompt: r.prompt,
      choices: r.choices ?? undefined,
    }));
  } catch (err) {
    // A storage problem must not take the brand page down with it
    console.error("[questions] falling back to seed set:", err);
    return SEED.slice(0, limit).map(strip);
  }
}

/**
 * Answers for signed-in members. The caller is responsible for having verified
 * the session first — this function does not check it, it only reads.
 * Unpublished questions are excluded so a draft can never leak through here.
 */
export async function getAnswers(ids: number[]): Promise<QuestionAnswer[]> {
  const wanted = ids.filter((id) => Number.isInteger(id));
  if (wanted.length === 0) return [];

  const seeded = SEED.filter((q) => wanted.includes(q.id)).map((q) => ({
    id: q.id,
    answer: q.answer,
    explanation: q.explanation,
  }));

  const realIds = wanted.filter((id) => id > 0);
  if (realIds.length === 0 || !isDbConfigured()) return seeded;

  try {
    const rows = await getDb()
      .select({
        id: questions.id,
        answer: questions.answer,
        explanation: questions.explanation,
      })
      .from(questions)
      .where(and(inArray(questions.id, realIds), eq(questions.published, true)));

    return [
      ...seeded,
      ...rows.map((r) => ({
        id: r.id,
        answer: r.answer ?? "등록된 모범답안이 없습니다.",
        explanation: r.explanation ?? "",
      })),
    ];
  } catch (err) {
    console.error("[questions] answer lookup failed:", err);
    return seeded;
  }
}
