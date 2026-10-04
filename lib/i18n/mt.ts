/**
 * Maltese UI copy — DRAFT. Every string needs a native-speaker review before launch.
 * Game words and glosses are never translated and never live here.
 */
export const mt = {
  // --- meta ---
  siteTagline: "Logħob tal-kliem bil-Malti, kuljum", // REVIEW
  doneForToday: "Lest għal-lum!", // REVIEW
  newGamesIn: "Logħob ġdid fi", // REVIEW
  siteDescription: "Logħba tal-kliem bil-Malti. Kelma ġdida kuljum, f'żewġ livelli.", // REVIEW
  howTitle: "Kif taħdem", // REVIEW

  // --- shared chrome ---
  switchLang: "Switch to English", // REVIEW (deliberately in English: it's for English readers)
  langShort: "EN", // REVIEW
  homeAria: "Lura d-dar", // REVIEW
  helpAria: "Kif tilgħab", // REVIEW
  statsAria: "Statistika u riżultat", // REVIEW
  settingsAria: "Issettjar", // REVIEW
  close: "Agħlaq", // REVIEW

  // --- home ---
  tagline: "6 tentattivi biex taqta' kelma b'ħames ittri", // REVIEW
  modeNormali: "Normali", // REVIEW
  modeTqila: "Diffiċli", // REVIEW
  doneToday: "lesta llum", // REVIEW
  wordOfDayTitle: "Kelma tal-llum", // REVIEW (spelling as requested; standard would be "tal-lum")

  // --- game ---
  notEnough: "Ittri mhux biżżejjed", // REVIEW
  notInList: "Mhux fil-lista", // REVIEW
  winToasts: ["Prosit!", "Prosit!", "Prosit!", "Prosit!", "Prosit!", "Prosit!"], // REVIEW
  lostToast: "Għal darb'oħra", // REVIEW
  enterKey: "DAĦĦAL", // REVIEW
  enterAria: "Daħħal it-tentattiv", // REVIEW
  backspaceAria: "Ħassar ittra", // REVIEW
  boardAria: "Il-bord", // REVIEW
  keyboardAria: "Tastiera", // REVIEW
  stateCorrect: "f'postha", // REVIEW
  statePresent: "fil-kelma, f'post ieħor", // REVIEW
  stateAbsent: "mhux fil-kelma", // REVIEW
  stateEmpty: "vojta", // REVIEW
  guessAnnouncement: (n: number, detail: string) => `Tentattiv ${n}: ${detail}`, // REVIEW
  puzzleNumber: (n: number) => `Nru ${n}`, // REVIEW
  noPuzzleBeforeTitle: "Kelma għadha ma bdietx", // REVIEW
  noPuzzleBeforeBody: "L-ewwel kelma toħroġ f'nofsillejl, ħin Malta.", // REVIEW
  noPuzzleAfterTitle: "M'hemmx kelma llum", // REVIEW
  noPuzzleAfterBody: "Qed inħejju l-kelmiet li jmiss. Erġa' ara għada.", // REVIEW

  // --- end of game ---
  wordWas: "Il-kelma kienet", // REVIEW
  todaysWord: "Il-kelma tal-lum", // REVIEW
  rootLabel: "Għerq", // REVIEW
  didYouKnow: "Kont taf?", // REVIEW
  credit: "Ġabra, L-Università ta' Malta", // REVIEW
  meaningFrom: "Tifsira minn", // REVIEW
  nextWordIn: "Kelma ġdida fi", // REVIEW
  newWordReady: "Il-kelma l-ġdida lesta", // REVIEW
  playNew: "Ilgħab", // REVIEW
  tryOther: { normali: "Ipprova d-Diffiċli", tqila: "Ipprova n-Normali" }, // REVIEW
  share: "Aqsam", // REVIEW
  copied: "Ikkupjat. Waħħlu fejn trid.", // REVIEW
  copiedShort: "Ikkupjat", // REVIEW
  copyFailed: "Ma setax jiġi kkupjat", // REVIEW
  resultTitleWon: "Prosit!", // REVIEW
  seeResult: "Ir-riżultat", // REVIEW

  // --- stats ---
  statsFor: (mode: string) => `Statistika · ${mode}`, // REVIEW
  played: "Logħbiet", // REVIEW
  winPct: "% rebħ", // REVIEW
  streak: "Sekwenza", // REVIEW
  maxStreak: "L-aqwa sekwenza", // REVIEW
  distribution: "Riżultati", // REVIEW
  emptyStats: "Ilgħab l-ewwel logħba tiegħek", // REVIEW
  emptyStatsBody: "Hawn tara kemm rbaħt, is-sekwenza tiegħek u kemm-il tentattiv ħadt.", // REVIEW

  // --- settings ---
  settingsTitle: "Issettjar", // REVIEW
  highContrast: "Kuntrast għoli", // REVIEW
  highContrastBody: "Oranġjo u blu minflok aħdar u isfar, għal min isibha iebsa jagħżel bejn il-kuluri.", // REVIEW

  // --- help modal (short) ---
  helpTitle: "Kif tilgħab", // REVIEW
  helpIntro: "Aqta' l-kelma f'6 tentattivi. Kull tentattiv irid ikun kelma Maltija ta' ħames ittri.", // REVIEW
  helpCorrect: "Aħdar: l-ittra fil-post it-tajjeb.", // REVIEW
  helpPresent: "Isfar: l-ittra fil-kelma, imma f'post ieħor.", // REVIEW
  helpAbsent: "Griż: l-ittra mhix fil-kelma.", // REVIEW
  helpMore: "Aktar dwar kif taħdem", // REVIEW
  gherqIntroTitle: (root: string) => `Sib il-kliem li jikber minn ${root}.`, // REVIEW
  gherqIntroBody: "Kull tifsira hawn taħt hija kelma: iktibha u agħfas DAĦĦAL.", // REVIEW
  gherqIntroDismiss: "Aħbi din in-nota", // REVIEW

  // --- how it works page ---
  howHeading: "Kif taħdem", // REVIEW
  howPlayTitle: "Kif tilgħab", // REVIEW
  howPlayBody: "Għandek 6 tentattivi biex taqta' kelma Maltija ta' ħames ittri. Wara kull tentattiv, il-kaxxi jinbidlu kulur biex juruk kemm qrib inti.", // REVIEW
  howExampleCorrect: "Il-B tinsab fil-kelma u fil-post it-tajjeb.", // REVIEW
  howExamplePresent: "Il-M tinsab fil-kelma, imma mhux f'dan il-post.", // REVIEW
  howExampleAbsent: "Il-O mhix fil-kelma xejn.", // REVIEW
  howDoublesTitle: "Ittri doppji", // REVIEW
  howDoublesBody: "Ittra tixgħel daqs kemm hemm kopji tagħha fil-kelma. Jekk tikteb żewġ A u l-kelma għandha A waħda biss, waħda biss tieħu l-kulur; l-oħra tibqa' griża.", // REVIEW
  howDoublesExample: "Jekk il-kelma hi SODDA, DAWRA tieħu A waħda biss: dik fil-post it-tajjeb. Id-D tixgħel isfar għax SODDA fiha D.", // REVIEW
  howModesTitle: "Żewġ livelli", // REVIEW
  howNormaliBody: "Kliem komuni ta' kuljum. Għal min qed jitgħallem il-Malti jew għadu qed jibnih.", // REVIEW
  howTqilaBody: "Kliem inqas komuni, għal min jitkellem il-Malti sew. Kultant tiltaqa' ma' kelma rari u antika li qed tintilef mill-użu. Dawk il-jiem jiġu, imma ma nwissukx meta.", // REVIEW
  howModesShared: "Kull livell għandu l-kelma tiegħu, l-istatistika tiegħu u s-sekwenza tiegħu.", // REVIEW
  howLettersTitle: "L-ittri Maltin", // REVIEW
  howLettersDigraphs: "GĦ u IE jieħdu żewġ kaxxi: waħda għal kull ittra.", // REVIEW
  howLettersKeys: "Ġ, Ħ, Ż u Ċ tinsabhom fuq it-tastiera tal-iskrin, ħdejn l-ittri mingħajr tikka.", // REVIEW
  howLettersPhysical: "Fuq tastiera fiżika, jekk tikteb C toħroġ Ċ, għax il-Malti m'għandux C. Għal Ġ, Ħ u Ż uża t-tastiera tal-iskrin jew tastiera bil-layout Malti.", // REVIEW
  howDailyTitle: "Kelma ġdida kuljum", // REVIEW
  howDailyBody: "Il-kelma tinbidel f'nofsillejl, ħin Malta, fiż-żewġ livelli.", // REVIEW
  howSourceTitle: "Id-dizzjunarju", // REVIEW
  howSourceBody: "Il-kliem u t-tifsiriet ġejjin minn Ġabra, il-lessiku Malti miftuħ tal-Università ta' Malta, taħt il-liċenzja CC BY 4.0.", // REVIEW
  howSourceLink: "Ġabra fuq GitHub", // REVIEW
  howLicenceLink: "Il-liċenzja CC BY 4.0", // REVIEW

  // --- Sellum (word ladder) ---
  sellumTagline: "Inżel is-sellum: ittra waħda kull darba", // REVIEW
  sellumPlay: "Ilgħab", // REVIEW
  sellumNumber: (n: number) => `Sellum #${n}`, // REVIEW
  changeOne: "Biddel ittra waħda biss", // REVIEW
  alreadyUsed: "Din diġà użajtha", // REVIEW
  deadEnd: "Kelma tajba, imma ma twasslekx", // REVIEW
  livesLeft: (n: number) => (n === 0 ? "Ma fadallek l-ebda ħajja" : n === 1 ? "Ħajja waħda fadal" : `${n} ħajjiet fadal`), // REVIEW
  lifeLost: (n: number) => (n === 0 ? "Tlift l-aħħar ħajja." : n === 1 ? "Tlift ħajja. Ħajja waħda fadal." : `Tlift ħajja. ${n} ħajjiet fadal.`), // REVIEW
  floorOf: (n: number, total: number) => `Ringiela ${n} minn ${total}`, // REVIEW
  galleryLocked: (i: number, letter: string) => `Ittra ${i}: ${letter}`, // REVIEW
  galleryClosed: "vojta", // REVIEW
  inPlace: "f'postha", // REVIEW
  wordAccepted: (w: string, row: number) => `${w}, tajba. Ringiela ${row}.`, // REVIEW
  sellumWon: "Prosit!", // REVIEW
  sellumLost: "Ir-rotta kienet…", // REVIEW
  yourLadder: "Is-sellum tiegħek", // REVIEW
  routesCount: (n: number) => `Kien hemm ${n} rotot`, // REVIEW
  otherRoute: "Rotta li ma ħadtx", // REVIEW
  formOf: (x: string) => `forma ta' ${x}`, // REVIEW
  playKelma: "Ilgħab Kelma", // REVIEW
  livesDist: "Riżultati", // REVIEW
  livesLost: "Tlift", // REVIEW
  sellumHelpIntro: "Mill-kelma ta' fuq sal-kelma t'isfel f'4 tarġiet. F'kull tarġa biddel ittra waħda, u kull kelma trid tkun Maltija.", // REVIEW
  sellumHelpEdit: "Ikteb il-kelma sħiħa, li tibdel ittra waħda biss mill-kelma ta' fuqha, u agħfas DAĦĦAL.", // REVIEW
  sellumHelpLives: "Għandek 3 ħajjiet. Kelma li mhix fil-lista, jew kelma tajba li ma twasslekx, tieħdok ħajja.", // REVIEW
  sellumHelpGreen: "Ittra ħadra tfisser li diġà qiegħda f'postha fil-kelma t'isfel.", // REVIEW
  sellumHowTitle: "Kif taħdem Sellum", // REVIEW
  sellumHowIntro: "Kuljum ikollok kelma fuq nett u kelma isfel nett. Mur minn waħda għall-oħra f'4 tarġiet eżatt, u f'kull tarġa biddel ittra waħda biss. Kull kelma li tuża trid tkun kelma Maltija.", // REVIEW
  sellumHowExample: "Eżempju: kull ringiela tibdel ittra waħda minn ta' fuqha.", // REVIEW
  sellumHowEditTitle: "Kif tikteb kelma", // REVIEW
  sellumHowEdit: "Kull ringiela tibda vojta. Ikteb il-kelma sħiħa, bl-istess ittri tal-kelma ta' fuqha ħlief waħda, u agħfas DAĦĦAL. ⌫ tħassar l-aħħar ittra. Jekk tbiddel l-ebda ittra jew aktar minn waħda, il-ringiela titħawwad u ma titlifx ħajja.", // REVIEW
  sellumHowLivesTitle: "Il-ħajjiet", // REVIEW
  sellumHowLivesSlip: "Tbiddel l-ebda ittra, jew aktar minn waħda, jew terġa' tuża kelma: ma titlifx ħajja, erġa' pprova.", // REVIEW
  sellumHowLivesWord: "Kelma li mhix fil-lista: titlef ħajja.", // REVIEW
  sellumHowLivesDead: "Kelma tajba imma li minnha ma tistax tasal fit-tarġiet li fadal: titlef ħajja.", // REVIEW
  sellumHowLivesEnd: "Jekk titlef it-3 ħajjiet, il-logħba tispiċċa u naraw rotta sħiħa.", // REVIEW
  sellumHowRoutesTitle: "Aktar minn triq waħda", // REVIEW
  sellumHowRoutes: "Ma hemmx tweġiba waħda. Kull puzzle għandu mill-inqas 3 rotot, u kull rotta li taħdem tgħodd. Fl-aħħar naraw kemm kien hemm rotot.", // REVIEW
  sellumHowGreen: "Wara kull kelma, l-ittri li diġà qegħdin f'posthom fil-kelma t'isfel isiru ħodor, b'linja taħthom.", // REVIEW

  // --- Għerq (root words) ---
  gherqTagline: "Sib il-kliem kollu li jikber mill-għerq", // REVIEW
  gherqTypePrompt: "Ikteb kelma…", // REVIEW
  startedToday: "bdejt illum", // REVIEW
  gherqNumber: (n: number) => `Għerq #${n}`, // REVIEW
  gherqTodayRoot: (root: string) => `Illum: ${root}`, // REVIEW
  alreadyFound: "Diġà sibtha", // REVIEW
  notFromRoot: "Mhux minn dan l-għerq", // REVIEW
  checkingWord: "Qed niċċekkja…", // REVIEW
  pointsOf: (e: number, t: number) => `${e} / ${t} punti`, // REVIEW
  bonusPointsOf: (b: number) => `+${b} bonus`, // REVIEW
  bonusCount: (found: number, total: number) => (found ? `Bonus ${found}/${total}` : `+${total} bonus`), // REVIEW
  bonusCountAria: (found: number, total: number) => `Kliem bonus, mhux meħtieġ għall-istilel: sibt ${found} minn ${total}`, // REVIEW
  bonusFound: "Kelma bonus!", // REVIEW
  bonusTitle: "Kliem bonus", // REVIEW
  nextStar: (n: number) => (n === 1 ? "Stilla oħra b'punt wieħed" : `Stilla oħra fi ${n} punti`), // REVIEW
  firstStar: "Sib kelma għall-ewwel stilla", // REVIEW
  allStars: "Sibt il-kliem kollu!", // REVIEW
  starsOf: (n: number) => (n === 1 ? "Stilla waħda minn 5" : `${n} stilel minn 5`), // REVIEW
  cluesTitle: (found: number, total: number) => `Tifsiriet: ${found} / ${total} misjuba`, // REVIEW
  clueAria: (len: number, hint: { position: number; letter: string } | null) => (hint ? `Kelma ta' ${len} ittri; l-ittra numru ${hint.position} hija ${hint.letter}` : `Kelma ta' ${len} ittri`), // REVIEW
  hint: "Ħjiel", // REVIEW
  hintNone: "M'hemmx aktar ħjiliet", // REVIEW
  hintAnnounce: (clue: string, position: number, letter: string) => `Ħjiel: ${letter} hija l-ittra numru ${position} ta' "${clue}"`, // REVIEW
  gherqNotAWord: "Mhux kelma tad-dizzjunarju", // REVIEW
  gherqNotToday: "Minn dan l-għerq, imma mhux fil-logħba tal-lum", // REVIEW
  gherqEmptyStatsBody: "Hawn tara l-istilel u s-sekwenza tiegħek.", // REVIEW
  gherqBeforeTitle: "Għerq għadu ma bediex", // REVIEW
  gherqBeforeBody: "L-ewwel għerq joħroġ f'nofsillejl, ħin Malta.", // REVIEW
  gherqAfterTitle: "M'hemmx għerq illum", // REVIEW
  gherqAfterBody: "Qed inħejju l-għeruq li jmiss. Erġa' ara għada.", // REVIEW
  gherqNewRootReady: "L-għerq il-ġdid lest", // REVIEW
  giveUp: "Ċedi", // REVIEW
  giveUpConfirm: "Żgur? Tara l-kliem kollu u l-logħba tal-lum tieqaf hawn. L-istilel li ksibt jibqgħu.", // REVIEW
  giveUpYes: "Iva, uri kollox", // REVIEW
  cancel: "Le, nibqa' nilgħab", // REVIEW
  wordFound: (w: string, gloss: string, p: number) => `${w}: ${gloss}. ${p === 1 ? "Punt wieħed" : `${p} punti`}.`, // REVIEW
  pointsAria: (p: number) => (p === 1 ? "punt wieħed" : `${p} punti`), // REVIEW
  missed: "ma sibtiex", // REVIEW
  posVerb: "Verbi", // REVIEW
  posNoun: "Nomi", // REVIEW
  posAdj: "Aġġettivi", // REVIEW
  gherqDone: "Prosit!", // REVIEW
  gherqRevealed: "Il-familja tal-għerq", // REVIEW
  starsDist: "Riżultati", // REVIEW
  avgStars: "Medja ta' stilel", // REVIEW
  playSellum: "Ilgħab Sellum", // REVIEW
  nextRootIn: "Għerq ġdid fi", // REVIEW
  gherqHelpIntro: "Kuljum ikollok għerq, bħal K-T-B. Sib il-kliem li jikber minnu: KITEB, KTIEB, KITBA… It-tifsira ta' kull kelma tidher mill-bidu, b'kaxxa għal kull ittra.", // REVIEW
  gherqHelpCounts: "Kliem tad-dizzjunarju biss: nomi, aġġettivi u verbi kif jidhru fid-dizzjunarju (KITEB, mhux JIKTEB).", // REVIEW
  gherqHelpPoints: "Kliem rari jiswa aktar punti. L-istilel jimtlew hekk kif tiġbor il-punti. Kliem rari ħafna huwa bonus: jgħodd jekk tafu, imma m'għandekx bżonnu għall-ħames stilel.", // REVIEW
  gherqHelpFree: "Tweġibiet ħżiena ma jiswewx xejn, u tista' terġa' tiġi aktar tard illum.", // REVIEW
  gherqHowTitle: "Kif taħdem Għerq", // REVIEW
  gherqHowRootTitle: "X'inhu għerq?", // REVIEW
  gherqHowRoot: "Ħafna kliem Malti jikber minn għerq, normalment ta' tliet konsonanti. Mill-għerq K-T-B jiġu KITEB, KTIEB, KITBA u KITTIEB. Kuljum ikollok għerq wieħed, u trid issib kemm tista' kliem li jikber minnu.", // REVIEW
  gherqHowExample: "Il-familja ta' K-T-B: kull kelma b'tifsirtha u l-punti tagħha.", // REVIEW
  gherqHowCountsTitle: "X'jgħodd", // REVIEW
  gherqHowCounts: "Kliem kif jidher fid-dizzjunarju biss: nomi, aġġettivi u verbi. KITEB jgħodd; KTIBT u JIKTEB ma jgħoddux, għax huma forom oħra tal-verb. Spelling alternattiv jgħodd bħala l-istess kelma.", // REVIEW
  gherqHowPointsTitle: "Punti u stilel", // REVIEW
  gherqHowPoints1: "Kliem komuni: punt wieħed", // REVIEW
  gherqHowPoints2: "Kliem inqas komuni: 2 punti", // REVIEW
  gherqHowPoints3: "Kliem rari: 3 punti bonus. M'għandekx bżonnu għall-istilel.", // REVIEW
  gherqHowStars: "L-ewwel kelma tagħtik stilla. Imbagħad tieħu stilla oħra meta tilħaq 25%, 50% u 75% tal-punti, u l-ħames stilla meta ssib il-kliem kollu li mhuwiex bonus.", // REVIEW
  gherqHowHintsTitle: "Ħjiliet", // REVIEW
  gherqHowHints: "It-tifsira ta' kull kelma tidher mill-bidu, b'kaxxa għal kull ittra. Il-buttuna Ħjiel timla ittra waħda ta' kelma: l-ewwel waħda li mhix ittra tal-għerq, għax dawk diġà tarahom. Il-ħjiliet jibdew mill-kelma l-aktar faċli u qasira. Tista' tużahom kemm trid; jingħaddu fir-riżultat.", // REVIEW
  gherqHowGiveUpTitle: "Ċedi", // REVIEW
  gherqHowGiveUp: "Ċedi juri l-familja kollha, bil-kliem li ma sibtx immarkat. L-istilel li ksibt jibqgħu. Jekk ma ċċedix, tista' tieqaf u terġa' tiġi aktar tard illum.", // REVIEW
  gherqHowFree: "Tweġibiet ħżiena ma jiswewx xejn: m'hemmx ħajjiet u lanqas limitu ta' ħin.", // REVIEW

  // --- home carousel ---
  carouselLabel: "Il-logħob", // REVIEW
  gameOf: (i: number, n: number, name: string) => `Logħba ${i} minn ${n}: ${name}`, // REVIEW
  prevGame: "Il-logħba ta' qabel", // REVIEW
  nextGame: "Il-logħba li jmiss", // REVIEW

  // --- 404 ---
  notFoundTitle: "Din il-paġna ma teżistix", // REVIEW
  notFoundHome: "Lura d-dar", // REVIEW
};
