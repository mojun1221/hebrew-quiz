const CONSONANTS = [
  { id:'aleph', glyph:'א', answers:['알레프','aleph','alef','01048463622'] },
  { id:'bet', glyph:'ב', answers:['베트','벳','bet','beth','01048463622'] },
  { id:'gimel', glyph:'ג', answers:['기멜','김멜','gimel','gimmel','01048463622'] },
  { id:'dalet', glyph:'ד', answers:['달레트','달렛','dalet','daleth','01048463622'] },
  { id:'he', glyph:'ה', answers:['헤','헤이','he','hey','01048463622'] },
  { id:'vav', glyph:'ו', answers:['바브','와우','바우','vav','waw','01048463622'] },
  { id:'zayin', glyph:'ז', answers:['자인','zayin','01048463622'] },
  { id:'het', glyph:'ח', answers:['헤트','헷','het','heth','chet','01048463622'] },
  { id:'tet', glyph:'ט', answers:['테트','텟','tet','teth','01048463622'] },
  { id:'yod', glyph:'י', answers:['요드','욧','yod','yodh','01048463622'] },
  { id:'kaf', glyph:'כ', answers:['카프','kaf','kaph','khaf','01048463622'] },
  { id:'lamed', glyph:'ל', answers:['라메드','라멧','lamed','lamedh','01048463622'] },
  { id:'mem', glyph:'מ', answers:['멤','메므','mem','01048463622'] },
  { id:'nun', glyph:'נ', answers:['눈','nun','01048463622'] },
  { id:'samekh', glyph:'ס', answers:['싸메크','사메크','사멕','samekh','samech','01048463622'] },
  { id:'ayin', glyph:'ע', answers:['아인','ayin','01048463622'] },
  { id:'pe', glyph:'פ', answers:['페','페이','pe','peh','phe','01048463622'] },
  { id:'tsade', glyph:'צ', answers:['짜데','차데','차디','tsade','tsadi','tzade','01048463622'] },
  { id:'qof', glyph:'ק', answers:['코프','쿼프','qof','qoph','kof','01048463622'] },
  { id:'resh', glyph:'ר', answers:['레쉬','레시','resh','01048463622'] },
  { id:'shin', glyph:'שׁ', answers:['쉰','신','shin','01048463622'] },
  { id:'sin', glyph:'שׂ', answers:['씬','신','sin','01048463622'] },
  { id:'tav', glyph:'ת', answers:['타브','타우','tav','taw','01048463622'] }
];

const VOWELS = [
  { id:'shewa', mark:'ְ', demo:'בְ', answers:['쉐바','쉐와','슈와','셰와','shewa','sheva','01048463622'] },
  { id:'hatef-segol', mark:'ֱ', demo:'בֱ', answers:['하탑 쎄골','하테프 세골','하테프세골','hataf segol','hatef segol','01048463622'] },
  { id:'hatef-patah', mark:'ֲ', demo:'בֲ', answers:['하탑 파탁','하테프 파타흐','하테프 파타ḥ','하테프 파타','하테프파타흐','hataf patah','hatef patah','01048463622'] },
  { id:'hatef-qamats', mark:'ֳ', demo:'בֳ', answers:['하탑 카메츠','하테프 카메츠','하테프카메츠','하테프 카마츠','hataf qamats','hatef qamats','hataf qametz','01048463622'] },
  { id:'hireq', mark:'ִ', demo:'בִ', answers:['히렉','히리크','hireq','hiriq','01048463622'] },
  { id:'tsere', mark:'ֵ', demo:'בֵ', answers:['쩨레','치레','tsere','tsereh','01048463622'] },
  { id:'segol', mark:'ֶ', demo:'בֶ', answers:['쎄골','세골','segol','01048463622'] },
  { id:'patah', mark:'ַ', demo:'בַ', answers:['파탁','파타흐','파타','patah','pathah','01048463622'] },
  { id:'qamats', mark:'ָ', demo:'בָ', answers:['카메츠','카마츠','qamats','qametz','kamatz','01048463622'] },
  { id:'holam', mark:'ֹ', demo:'בֹ', answers:['홀렘','홀람','호람','holam','holem','01048463622'] },
  { id:'qibbuts', mark:'ֻ', demo:'בֻ', answers:['키부츠','qibbuts','kubbutz','qibbus','01048463622'] },

  // 완전 모음 철자는 자음+모음 조합에서 실제 요드/바브까지 보이도록 mark에 포함
  { id:'hireq-yod', mark:'ִי', demo:'בִי', answers:['히렉 요드','히리크 요드','히릭 요드','hireq yod','hiriq yod','hireq-yod','hiriq-yod','01048463622'] },
  { id:'tsere-yod', mark:'ֵי', demo:'בֵי', answers:['쩨레 요드','체레 요드','쯔레 요드','tsere yod','tsere-yod','tsere yodh','sere yod','01048463622'] },
  { id:'shureq', mark:'וּ', demo:'בוּ', answers:['슈렉','슈레크','수렉','shureq','shurek','shuruk','sureq','01048463622'] },
  { id:'holem-vav', mark:'וֹ', demo:'בוֹ', answers:['홀렘 바브','홀람 바브','홀렘 와우','홀람 와우','holem vav','holam vav','holem waw','holam waw','holem-vav','01048463622'] }
];
