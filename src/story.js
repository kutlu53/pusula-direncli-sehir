import { PLACES, RISKS, BOZTEPE, coastZ, riverX } from './terrain.js';

const SORU_KATMAN = {
  id: 'B3S1', beceri: 'Katmanları birlikte yorumlama',
  metin: 'Bir yerde eğim çok fazla ve ağaçlar kesilmiş. Katmanları üst üste koyan haritacı hangi sonuca varır?',
  secenekler: ['Sel riski yüksektir', 'Heyelan riski yüksektir', 'Hiçbir risk yoktur', 'Kuraklık riski yüksektir'], dogru: 1,
  aciklama: 'Dik eğim ve ağaçsız toprak bir araya gelince heyelan riski artar. Tek bir bilgi yetmez; katmanlar birlikte okununca risk ortaya çıkar.',
};

export const CHAPTERS = [
  { no: 1, ad: 'Kayıp Harita', rozet: 'Harita Çırağı', simge: '🧭' },
  { no: 2, ad: 'Gökten Bakış', rozet: 'Gök Gözcüsü', simge: '🛸' },
  { no: 3, ad: 'Katmanlar', rozet: 'Katman Ustası', simge: '🗂️' },
];
export const NEXT_CHAPTER = '4. Bölüm: Yerin Altı, Göğün Üstü — yakında';

// Adım türleri: npc / parca / nesne (hedefe yürü, E ile etkileşim) ve drone (havadan hedefleri fotoğrafla).
// Sıra: once diyaloğu → onEtkinlik → soru → sonra diyaloğu → etkinlikler → kapanis diyaloğu.
// "acar": harita üzerinde açılan bölge [minX, maxX, minZ, maxZ].
export const STEPS = [
  {
    id: 'usta', bolum: 1, hedef: PLACES.iskele, tur: 'npc',
    gorev: 'İskelenin ucundaki Hasan Usta ile konuş',
    once: [
      ['Hasan Usta', 'Hoş geldin genç kâşif! Ben Hasan Usta. Kırk yıl boyunca Ordu\'nun haritalarını çizdim.'],
      ['Hasan Usta', 'Şehrimiz büyüdü; ama her yere doğru kurulmadı. Dere yataklarına, kaygan yamaçlara evler yapıldı.'],
      ['Hasan Usta', 'Son haritamı bitiremeden fırtına çıktı ve parçalarını dört bir yana savurdu. Onları bulup haritayı tamamlamana ihtiyacım var.'],
      ['Hasan Usta', 'Al, bu benim pusulam. Ekranın üstündeki şeride bak: K kuzey, D doğu, G güney, B batı demek.'],
    ],
    soru: {
      id: 'B1S1', beceri: 'Yön bulma',
      metin: 'Pusulana bak ve denize dön. Karadeniz, Ordu\'nun hangi yönünde kalıyor?',
      secenekler: ['Kuzey', 'Güney', 'Doğu', 'Batı'], dogru: 0,
      aciklama: 'Ordu, Karadeniz kıyısında kuruludur ve deniz şehrin kuzeyindedir. Bu yüzden Ordu\'da denize bakan kişi kuzeye bakar.',
    },
    sonra: [
      ['Hasan Usta', 'İlk parça Taşbaşı\'nda, eski taş binanın önünde. İskeleden çık, BATIYA doğru sahil boyunca yaklaşık 600 metre yürü.'],
      ['Hasan Usta', 'Yaklaşınca parçanın ışığını görürsün. Takılırsan ipucu isteyebilirsin. Öğrendiklerin Kâşif Defteri\'ne yazılacak.'],
    ],
  },
  {
    id: 'tasbasi', bolum: 1, hedef: PLACES.tasbasi, tur: 'parca', acar: [-450, 20, -450, 100],
    gorev: 'Taşbaşı\'ndaki ilk harita parçasını bul (iskelenin batısı, ~600 m)',
    once: [['Sen', 'İşte ilk parça! Kıyı çizgisi ve Boztepe\'nin etekleri çizilmiş.']],
    soru: {
      id: 'B1S2', beceri: 'Harita okuma',
      metin: 'Haritalarda, başka bir işaret yoksa üst kenar hangi yönü gösterir?',
      secenekler: ['Doğu', 'Kuzey', 'Güney', 'Batı'], dogru: 1,
      aciklama: 'Haritaların üst kenarı kuzeyi gösterir. Böylece sağ taraf doğu, sol taraf batı, alt taraf güney olur.',
    },
    sonra: [
      ['Hasan Usta (telsiz)', 'Harika! Haritanı açabilirsin. Altındaki ölçek çubuğu, haritadaki uzunluğun gerçekte kaç metre olduğunu söyler.'],
      ['Hasan Usta (telsiz)', 'İkinci parça Melet Irmağı\'nın üzerindeki köprüde. Buradan DOĞU-GÜNEYDOĞU yönünde, yaklaşık 1,8 kilometre.'],
    ],
  },
  {
    id: 'kopru', bolum: 1, hedef: PLACES.kopru, tur: 'parca', acar: [20, 450, -450, 100],
    gorev: 'Melet Köprüsü\'ndeki ikinci parçayı bul (doğu-güneydoğu, ~1,8 km)',
    once: [['Sen', 'İkinci parça köprünün tam ortasındaymış. Irmak buradan denize doğru akıyor.']],
    soru: {
      id: 'B1S3', beceri: 'Yer şekli - akarsu ilişkisi',
      metin: 'Melet Irmağı dağlardan doğup Karadeniz\'e dökülür. Irmak hangi yönden hangi yöne akar?',
      secenekler: ['Kuzeyden güneye', 'Doğudan batıya', 'Güneyden kuzeye', 'Batıdan doğuya'], dogru: 2,
      aciklama: 'Su hep yüksekten alçağa akar. Ordu\'da arazi güneye gidildikçe yükselir, deniz ise kuzeydedir. Bu yüzden ırmak güneyden kuzeye akar.',
    },
    sonra: [
      ['Hasan Usta (telsiz)', 'Aferin! Irmağın iki yanındaki düzlüğe dikkat et; orası ırmağın taşkın yatağı. Bunu ileride yine konuşacağız.'],
      ['Hasan Usta (telsiz)', 'Üçüncü parça bir fındık bahçesinde. Köprüden GÜNEYBATI yönünde, yaklaşık 1,2 kilometre. Yol yokuş, hazırlıklı ol!'],
    ],
  },
  {
    id: 'findik', bolum: 1, hedef: PLACES.findik, tur: 'parca', acar: [20, 450, 100, 450],
    gorev: 'Fındık bahçesindeki üçüncü parçayı bul (güneybatı, ~1,2 km)',
    once: [['Sen', 'Parça fındık ocaklarının arasına düşmüş. Ordu, Türkiye\'nin en çok fındık üreten ili!']],
    soru: {
      id: 'B1S4', beceri: 'Harita okuma',
      metin: 'Fiziki haritada renkler yeşilden kahverengiye doğru değiştikçe ne anlaşılır?',
      secenekler: ['Nüfus artar', 'Yükselti artar', 'Yağış azalır', 'Orman artar'], dogru: 1,
      aciklama: 'Fiziki haritalarda renkler yükseltiyi gösterir: yeşil alçak yerleri, sarı ve kahverengi yüksek yerleri anlatır.',
    },
    sonra: [
      ['Hasan Usta (telsiz)', 'Son parça Boztepe\'nin zirvesinde. Haritanda şehrin batısındaki en koyu kahverengi yeri bul.'],
      ['Hasan Usta (telsiz)', 'Bulunduğun yerden KUZEYBATI yönünde, yaklaşık 1,3 kilometre. Tırmanış seni biraz yoracak!'],
    ],
  },
  {
    id: 'boztepe', bolum: 1, hedef: PLACES.boztepe, tur: 'parca', acar: [-450, 450, -450, 450],
    gorev: 'Boztepe\'nin zirvesindeki son parçayı bul (kuzeybatı, ~1,3 km)',
    once: [['Sen', 'Zirvedeyim! Bütün şehir, ırmak ve deniz ayaklarımın altında.']],
    soru: {
      id: 'B1S5', beceri: 'Mekânsal düşünme',
      metin: 'Zirveden şehre bak. Ordu neden deniz kıyısı boyunca dar bir şerit hâlinde uzanıyor?',
      secenekler: [
        'Dağlar kıyıya yakın ve paralel uzandığı için düz alan az',
        'Deniz kenarı daha soğuk olduğu için',
        'Güneyde hiç su bulunmadığı için',
        'Irmak şehri ikiye böldüğü için',
      ], dogru: 0,
      aciklama: 'Karadeniz\'de dağlar kıyıya paralel ve çok yakın uzanır. Düz alan az olduğundan yerleşmeler kıyı boyunca dar bir şeritte toplanır.',
    },
    sonra: [
      ['Hasan Usta (telsiz)', 'Haritayı tamamladın, kâşif! Ama iyi bir haritacı yalnızca okumaz; kendisi de gösterir ve anlatır.'],
      ['Hasan Usta (telsiz)', 'Kâşif Defteri\'ni aç. Önce haritada birkaç yeri sen işaretle, sonra Ordu\'nun Türkiye\'deki yerini bulalım.'],
    ],
    etkinlikler: ['isaretle', 'komsu', 'ozet1'],
    kapanis: [
      ['Hasan Usta (telsiz)', 'Çok güzel anlattın! Şimdi haritaya bir daha bak: düz alan bitince insanlar dere yataklarına ve dik yamaçlara ev yapmış.'],
      ['Hasan Usta (telsiz)', 'Sel ve heyelan, Ordu\'nun en büyük iki tehlikesi. Sıradaki görevde şehre gökyüzünden bakıp bu tehlikeli yerleri arayacağız.'],
    ],
    bolumSonu: 1,
  },

  // ---------------- 2. BÖLÜM: GÖKTEN BAKIŞ ----------------
  {
    id: 'album', bolum: 2, hedef: { x: BOZTEPE.x + 4, z: BOZTEPE.z - 3 }, tur: 'nesne', etiket: 'Drone\'u al',
    gorev: 'Boztepe terasındaki drone\'u al',
    once: [
      ['Hasan Usta (telsiz)', 'Terasa sana bir sürpriz bıraktım: benim emektar drone\'um! Onunla şehre kuş gibi yukarıdan bakacaksın.'],
      ['Hasan Usta (telsiz)', 'Ama önce albümüme göz at. Kırk yıl önce çektiğim hava fotoğrafını bugünküyle karşılaştır; bakalım neler değişmiş?'],
    ],
    onEtkinlik: ['karsilastir'],
    soru: {
      id: 'B2S1', beceri: 'Değişimi yorumlama (neden)',
      metin: 'Şehir kırk yılda ırmak kenarına ve yamaçlara doğru yayılmış. Bunun temel nedeni nedir?',
      secenekler: [
        'Nüfus arttı, kıyıdaki düz alan yetmedi',
        'Deniz kıyısı yasaklandı',
        'Yamaçlarda hava daha sıcak',
        'Irmak kenarında toprak daha sert',
      ], dogru: 0,
      aciklama: 'Nüfus arttıkça yeni evlere ihtiyaç doğdu. Kıyıdaki dar düzlük dolunca insanlar ırmak kenarına ve yamaçlara yerleşti.',
    },
    sonra: [
      ['Hasan Usta (telsiz)', 'Şimdi sıra sende. Drone\'u havalandır ve albümde gördüğün üç riskli yeri gerçekte bul.'],
      ['Hasan Usta (telsiz)', 'Aradıkların: ırmak kenarındaki evler, dik yamaçtaki evler ve kesilen orman. Bulduğun yerin üzerine gel ve fotoğrafını çek!'],
    ],
  },
  {
    id: 'drone', bolum: 2, tur: 'drone',
    gorev: 'Drone ile üç riskli yeri bul ve fotoğrafla',
    hedefler: [
      {
        key: 'taskin', ...RISKS.taskin, ipucu: 'ırmak kenarındaki evler (köprünün güneyi)',
        soru: {
          id: 'B2S2', beceri: 'Değişimi yorumlama (sonuç)',
          metin: 'Bu evler ırmağın hemen kenarına, taşkın yatağına yapılmış. Onlar için en büyük tehlike nedir?',
          secenekler: ['Kuraklık', 'Sel ve taşkın', 'Çığ', 'Orman yangını'], dogru: 1,
          aciklama: 'Şiddetli yağışta ırmak yatağına sığmaz ve taşkın yatağını doldurur. Buraya yapılan evler su altında kalabilir.',
        },
      },
      {
        key: 'yamac', ...RISKS.yamac, ipucu: 'dik yamaçtaki evler (Boztepe\'nin doğu yamacı)',
        soru: {
          id: 'B2S3', beceri: 'Değişimi yorumlama (sonuç)',
          metin: 'Dik yamaçtaki ağaçlar kesilip yerine ev yapılmış. Bu durum hangi afetin riskini artırır?',
          secenekler: ['Heyelan', 'Kuraklık', 'Hortum', 'Tsunami'], dogru: 0,
          aciklama: 'Ağaç kökleri toprağı tutar. Karadeniz\'de yağış bol, yamaçlar diktir; ağaçsız kalan ıslak toprak kayabilir. Buna heyelan denir.',
        },
      },
      {
        key: 'orman', ...RISKS.orman, ipucu: 'kesilen orman (fındık bahçesinin doğusundaki yamaç)',
        soru: {
          id: 'B2S4', beceri: 'Değişimi yorumlama (sonuç)',
          metin: 'Ormanın kesildiği bu alanda yağmur suyu nasıl davranır?',
          secenekler: [
            'Olduğu yerde kalır, hiç akmaz',
            'Toprağa daha çok sızar',
            'Toprağa az sızar, yüzeyden hızla akar',
            'Hemen buharlaşır',
          ], dogru: 2,
          aciklama: 'Orman yağmuru tutar ve suyun toprağa sızmasını sağlar. Orman kesilince su hızla derelere iner; sel ve toprak kaybı artar.',
        },
      },
    ],
    sonra: [
      ['Hasan Usta (telsiz)', 'Üç fotoğraf da elimde. Gözlerin keskinmiş, kâşif! Şimdi gördüklerini defterine kendi sözlerinle yaz.'],
    ],
    etkinlikler: ['ozet2'],
    kapanis: [
      ['Hasan Usta (telsiz)', 'Değişimi gördün: şehir büyüdükçe doğa geri çekilmiş, tehlike artmış. Ama tehlikenin tam olarak nerede olduğunu bilmek için daha fazlası gerek.'],
      ['Hasan Usta (telsiz)', 'Sıradaki görevde eğim, dere yatağı ve yağış haritalarını üst üste koyup şehrin risk haritasını çıkaracağız.'],
    ],
    bolumSonu: 2,
  },

  // ---------------- 3. BÖLÜM: KATMANLAR ----------------
  {
    id: 'masa', bolum: 3, hedef: PLACES.iskele, tur: 'npc',
    gorev: 'Fotoğrafları iskeledeki Hasan Usta\'ya götür',
    once: [
      ['Hasan Usta', 'Fotoğrafların harika, kâşif! Ama tek tek fotoğraf yetmez. Tehlikeyi görmek için bilgileri üst üste koymak gerekir.'],
      ['Hasan Usta', 'Bir saydam kâğıda eğimi, birine ırmağın taşkın alanını, birine yapıları çizeriz. Her biri bir katmandır. Üst üste koyunca risk ortaya çıkar.'],
      ['Hasan Usta', 'Bugün bunu bilgisayarlar yapıyor; adına Coğrafi Bilgi Sistemi, kısaca CBS deniyor. Katman masamı aç: altı yer işaretledim, her birinin riskini sen belirle.'],
    ],
    onEtkinlik: ['katman'],
    soru: SORU_KATMAN,
    sonra: [
      ['Hasan Usta', 'Risk haritan hazır! Artık haritanı açınca "Risk katmanı" düğmesiyle onu görebilirsin: mavi sel, kırmızı heyelan, yeşil düşük risk.'],
      ['Hasan Usta', 'Şimdi haritayı sahada kullanma zamanı. Sana üç cihaz veriyorum; her birini haritana bakarak doğru yere yerleştir.'],
    ],
  },
  {
    id: 'sensor', bolum: 3, tur: 'sensor',
    gorev: 'Cihazları risk haritana göre doğru yerlere yerleştir',
    cihazlar: [
      { t: 'sel', ad: 'Su seviyesi sensörü', nereye: 'sel riski olan bir yere (haritada mavi)',
        tamam: 'Su seviyesi sensörü yerinde! Irmak yükselmeye başlarsa taşkından önce uyarı verecek.' },
      { t: 'heyelan', ad: 'Toprak hareket sensörü', nereye: 'heyelan riski olan dik bir yamaca (haritada kırmızı)',
        tamam: 'Toprak hareket sensörü yerinde! Yamaç kaymaya başlarsa erkenden haber verecek.' },
      { t: 'guvenli', ad: 'Toplanma alanı tabelası', nereye: 'düşük riskli, düz bir yere (haritada yeşil)',
        tamam: 'Toplanma alanı hazır! AFAD her mahalle için böyle alanlar belirler; afet anında insanlar burada güvenle buluşur.' },
    ],
    sonra: [
      ['Hasan Usta (telsiz)', 'Üç cihaz da doğru yerde. Haritayı yalnızca okumadın; onunla karar verdin. Gerçek bir haritacı böyle çalışır!'],
    ],
    etkinlikler: ['ozet3'],
    kapanis: [
      ['Hasan Usta (telsiz)', 'Artık tehlikenin NEREDE olduğunu biliyoruz. Peki sel ve heyelan NASIL oluşur? Yağmur, eğim ve toprak arasında ne var?'],
      ['Hasan Usta (telsiz)', 'Sıradaki görevde deney yapacağız: yerin altına ve göğün üstüne bakacağız.'],
    ],
    bolumSonu: 3,
  },
];

// 3. bölüm katman masasındaki yerler; "dogru" değeri arazi modelindeki risk sınıfıyla aynıdır
export const KATMAN_YERLER = [
  { harf: 'A', ad: 'Irmak kenarındaki evler', x: RISKS.taskin.x + 20, z: RISKS.taskin.z, dogru: 'sel' },
  { harf: 'B', ad: 'Boztepe yamacındaki evler', x: RISKS.yamac.x, z: RISKS.yamac.z, dogru: 'heyelan' },
  { harf: 'C', ad: 'Şehir merkezi', x: 70, z: coastZ(70) + 70, dogru: 'guvenli' },
  { harf: 'D', ad: 'Ormanı kesilen yamaç', x: RISKS.orman.x, z: RISKS.orman.z, dogru: 'heyelan' },
  { harf: 'E', ad: 'Irmak ağzındaki düzlük', x: riverX(-40) + 22, z: -40, dogru: 'sel' },
  { harf: 'F', ad: 'Doğu mahallesi', x: 330, z: 60, dogru: 'guvenli' },
];

// ---------------- Kâşif Defteri etkinlikleri ----------------
const mouthZ = coastZ(riverX(-70));
export const ISARET = [
  { metin: 'Boztepe\'nin zirvesini işaretle', x: BOZTEPE.x, z: BOZTEPE.z, tol: 55 },
  { metin: 'Melet Irmağı\'nın denize döküldüğü yeri işaretle', x: riverX(mouthZ), z: mouthZ, tol: 55 },
  { metin: 'Hasan Usta\'nın iskelesini işaretle', x: PLACES.iskele.x, z: PLACES.iskele.z, tol: 45 },
];

export const KOMSU = {
  // yuva: doğru etiket
  yuvalar: { kuzey: 'Karadeniz', bati: 'Samsun', dogu: 'Giresun', guneybati: 'Tokat', guney: 'Sivas' },
  aciklama: 'Ordu\'nun kuzeyinde Karadeniz, batısında Samsun, doğusunda Giresun, güneybatısında Tokat, güneyinde Sivas bulunur.',
};

export const CLOZE = {
  ozet1: {
    baslik: 'Ordu\'nun konumunu özetle',
    defter: 'Konum özetim',
    parcalar: [
      'Ordu, Türkiye\'nin ', { sec: ['güney', 'kuzey', 'batı'], dogru: 'kuzey' }, ' kesiminde, ',
      { sec: ['Akdeniz', 'Ege Denizi', 'Karadeniz'], dogru: 'Karadeniz' }, ' kıyısındadır. Batısında ',
      { sec: ['Samsun', 'Giresun', 'Sivas'], dogru: 'Samsun' }, ', doğusunda ',
      { sec: ['Tokat', 'Samsun', 'Giresun'], dogru: 'Giresun' }, ' bulunur. Şehrin kuzeyinde ',
      { sec: ['dağlar', 'deniz'], dogru: 'deniz' }, ', güneyinde ', { sec: ['dağlar', 'deniz'], dogru: 'dağlar' }, ' vardır.',
    ],
    serbest: 'Ordu\'yu hiç görmemiş bir arkadaşına şehrin yerini kendi cümlenle anlat:',
  },
  ozet2: {
    baslik: 'Şehirdeki değişimi özetle',
    defter: 'Değişim özetim',
    parcalar: [
      'Kırk yılda şehir ', { sec: ['küçüldü', 'büyüdü'], dogru: 'büyüdü' }, '. Irmak kenarına yapılan evler ',
      { sec: ['kuraklık', 'sel', 'çığ'], dogru: 'sel' }, ' tehlikesi altındadır. Dik yamaçlarda ağaçlar kesilirse ',
      { sec: ['heyelan', 'kuraklık', 'hortum'], dogru: 'heyelan' }, ' riski artar. Ormanlar yağmur suyunu ',
      { sec: ['hızlandırır', 'tutar'], dogru: 'tutar' }, ' ve toprağı korur.',
    ],
    serbest: 'Sence şehir büyürken riskli yerlere ev yapılmaması için ne yapılmalı? Kendi cümlenle yaz:',
  },
};

CLOZE.ozet3 = {
  baslik: 'Risk haritasını özetle',
  defter: 'Risk özetim',
  parcalar: [
    'Bilgileri üst üste koyarak incelemeye ', { sec: ['ölçek', 'katman', 'pusula'], dogru: 'katman' }, ' yöntemi denir. Eğimin çok olduğu yamaçlarda ',
    { sec: ['sel', 'heyelan'], dogru: 'heyelan' }, ', ırmak kenarındaki düzlüklerde ', { sec: ['sel', 'heyelan'], dogru: 'sel' },
    ' riski yüksektir. Toplanma alanı ', { sec: ['dik yamaçtaki', 'ırmak kenarındaki', 'düşük riskli'], dogru: 'düşük riskli' }, ' bir yere kurulur.',
  ],
  serbest: 'Kendi mahallende ya da okulunun çevresinde riskli olabilecek bir yer var mı? Neden öyle düşünüyorsun?',
};

export const FARKLAR = [
  { ...RISKS.taskin, r: 48, metin: 'Irmak kenarı: Eskiden boş olan taşkın yatağına evler yapılmış.' },
  { ...RISKS.yamac, r: 40, metin: 'Boztepe yamacı: Ağaçlar kesilmiş, dik yamaca evler yapılmış.' },
  { ...RISKS.orman, r: 48, metin: 'Güney yamaçlar: Orman kesilip açılmış, yerine birkaç ev yapılmış.' },
];
