import { PLACES, RISKS, BOZTEPE, coastZ, riverX, riskAt, slopeAt, M_PER_UNIT } from './terrain.js';

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
  { no: 4, ad: 'Yerin Altı, Göğün Üstü', rozet: 'Deney Ustası', simge: '🧪' },
  { no: 5, ad: 'Yeniden Kur', rozet: 'Şehir Plancısı', simge: '🏗️' },
];
export const NEXT_CHAPTER = '6. Bölüm: Büyük Sınav — yakında';

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

  // ---------------- 4. BÖLÜM: YERİN ALTI, GÖĞÜN ÜSTÜ ----------------
  {
    id: 'afad', bolum: 4, hedef: PLACES.afad, tur: 'npc',
    gorev: 'Melet Köprüsü\'nün batı ucundaki turuncu AFAD çadırına git',
    once: [
      ['Elif Abla', 'Merhaba kâşif! Ben Elif, AFAD gönüllüsüyüm. AFAD, yani Afet ve Acil Durum Yönetimi Başkanlığı; afetlere hazırlık yapar, afet olunca yardıma koşar.'],
      ['Elif Abla', 'Hasan Usta senden çok söz etti. Risk haritan işimize yarayacak. Ama insanlara riski anlatmak için NEDEN olduğunu da bilmelisin.'],
      ['Elif Abla', 'Bu deney setinde yağışı ve yamacın örtüsünü değiştirip ırmağa ne olduğunu görebilirsin. İki görevin var; listeye bak ve dene!'],
    ],
    onEtkinlik: ['deney-sel'],
    soru: {
      id: 'B4S1', beceri: 'Neden-sonuç (sel)',
      metin: 'Deneyde, aynı şiddetli yağmurda ırmağın taşmasını ne önledi?',
      secenekler: [
        'Yamacın betonla kaplanması',
        'Ormanın suyu tutup toprağa sızdırması',
        'Irmağın kenarına ev yapılması',
        'Yamaçtaki ağaçların kesilmesi',
      ], dogru: 1,
      aciklama: 'Orman yağmuru yapraklarıyla ve toprağıyla tutar, suyun büyük kısmı toprağa sızar. Çıplak ya da betonla kaplı yüzeyde su sızamaz, hızla ırmağa akar ve ırmak taşar.',
    },
    sonra: [
      ['Elif Abla', 'Harika gözlem! Sel yalnızca "çok yağmur" demek değil; suyun gidecek yer bulamaması demek.'],
      ['Elif Abla', 'Deney setinin ikinci kutusunu al. Boztepe yamacındaki evlerin orada Kemal Bey var; yeni evler yapmak istiyor. Onunla konuşman gerek.'],
    ],
  },
  {
    id: 'kemal', bolum: 4, hedef: PLACES.kemal, tur: 'npc',
    gorev: 'Boztepe\'nin doğu yamacındaki evlerin yanında Kemal Bey\'i bul',
    once: [
      ['Kemal Bey', 'Sen de kimsin evlat? Ben Kemal, müteahhidim. Bu yamaçtaki evleri ben yaptım; şimdi yanlarına altı ev daha yapacağım.'],
      ['Sen', 'Ama Kemal Bey, burası risk haritasında kıpkırmızı. Heyelan riski var!'],
      ['Kemal Bey', 'Heyelan mı? Otuz yıldır buradayım, bu yamaç yerinden kıpırdamadı. Toprak durduk yere neden kaysın?'],
      ['Sen', 'Elif Abla\'nın deney setini getirdim. Gelin birlikte deneyelim; kendi gözünüzle görün.'],
    ],
    onEtkinlik: ['deney-heyelan'],
    soru: {
      id: 'B4S2', beceri: 'Kanıta dayalı ikna',
      metin: 'Kemal Bey hâlâ kararsız. Onu ikna etmek için en güçlü söz hangisi?',
      secenekler: [
        'Herkes burasının tehlikeli olduğunu söylüyor.',
        'Bence bu evler hiç güzel görünmüyor.',
        'Deneyde gördük: ağaçlar kesilip toprak ıslanınca dik yamaç kayıyor. Burası dik, ağaçsız ve yağış bol.',
        'Hasan Usta sizin evlerinizi sevmiyor.',
      ], dogru: 2,
      aciklama: 'İnsanları ikna etmenin en sağlam yolu kanıt göstermektir. "Herkes öyle diyor" ya da "bence" yerine deneyin sonucunu ve buranın özelliklerini söylemek gerekir.',
    },
    sonra: [
      ['Kemal Bey', 'Hımm... Kendi gözümle gördüm. Keşke o ağaçları kesmeseydim. Yeni evleri buraya yapmayacağım.'],
      ['Kemal Bey', 'Ama insanların eve ihtiyacı var, kâşif. Buraya olmazsa nereye yapacağız? Onu da bana sen göstereceksin!'],
    ],
    etkinlikler: ['ozet4'],
    kapanis: [
      ['Hasan Usta (telsiz)', 'Kemal Bey\'i sözle değil, kanıtla ikna ettin. Farkındalık böyle başlar: önce anla, sonra göster.'],
      ['Hasan Usta (telsiz)', 'Kemal Bey haklı bir soru sordu: Evler nereye yapılmalı? Sıradaki görevde şehri birlikte yeniden planlayacağız.'],
    ],
    bolumSonu: 4,
  },

  // ---------------- 5. BÖLÜM: YENİDEN KUR ----------------
  {
    id: 'plan', bolum: 5, hedef: PLACES.afad, tur: 'npc',
    gorev: 'AFAD çadırındaki planlama toplantısına katıl (Melet Köprüsü\'nün batı ucu)',
    once: [
      ['Elif Abla', 'Hoş geldin kâşif! Bugün büyük gün: belediye, şehrin yeni planını bizden istiyor. Hasan Usta ve Kemal Bey telsizde.'],
      ['Kemal Bey (telsiz)', 'Ben hazırım! Yeni bir okul, bir hastane ve riskli yerlerde oturan aileler için konutlar yapacağız. Yeter ki bana doğru yeri gösterin.'],
      ['Hasan Usta (telsiz)', 'Unutma kâşif: üç şeyi birlikte düşüneceksin. Güvenlik, erişim ve bütçe. Birini unutursan plan geri döner.'],
      ['Elif Abla', 'İki işimiz daha var: ırmağın taşkın yatağını parka çevirmek ve çıplak kalan dik yamacı ağaçlandırmak. Planlama masası senin!'],
    ],
    onEtkinlik: ['plan'],
    soru: {
      id: 'B5S1', beceri: 'Mekânsal karar verme',
      metin: 'Okul için iki arsa var: biri merkeze çok yakın ama sel riskli, diğeri biraz uzak ama düşük riskli. Hangisi seçilmeli?',
      secenekler: [
        'Yakın olan; çocuklar yürüyerek gider',
        'Düşük riskli olan; can güvenliği önce gelir, uzaklık yol ve servisle çözülür',
        'Hangisi ucuzsa o',
        'Fark etmez, ikisi de olur',
      ], dogru: 1,
      aciklama: 'Yer seçerken önce can güvenliği düşünülür. Uzaklık yol ya da servisle çözülebilir; ama riskli yere kurulan bir okulu afetten korumak çok zordur.',
    },
    sonra: [
      ['Kemal Bey (telsiz)', 'Plan onaylandı! Ekiplerim işe koyuldu bile. Okulun temelini bugün atıyoruz; töreni sensiz yapmayız.'],
      ['Elif Abla', 'Haritanı aç; seçtiğin yerler işaretlendi. Yeni okulun yerine git, hepimiz orada buluşalım.'],
    ],
  },
  {
    id: 'temel', bolum: 5, tur: 'nesne', hedefPlan: 'okul', etiket: 'Törene katıl',
    gorev: 'Haritanda yerini seçtiğin yeni okula git (haritada O harfi)',
    once: [
      ['Kemal Bey', 'İşte okulumuz! Sağlam zemine, düşük riskli yere. İlk kez bir binayı gönül rahatlığıyla yapıyorum.'],
      ['Hasan Usta (telsiz)', 'Kırk yıl harita çizdim; ama haritayı karara dönüştüren sen oldun, kâşif.'],
    ],
    etkinlikler: ['ozet5'],
    kapanis: [
      ['Elif Abla (telsiz)', 'Şehir artık daha hazırlıklı. Ama gerçek sınav, afet geldiğinde verilir. Meteoroloji önümüzdeki günler için şiddetli yağış uyarısı yaptı.'],
      ['Elif Abla (telsiz)', 'Sıradaki görevde planının işe yarayıp yaramadığını göreceğiz. Hazırlan!'],
    ],
    bolumSonu: 5,
  },
];

// ---------------- 5. bölüm: planlama masası ----------------
const MERKEZ = { x: 60, z: coastZ(60) + 70 };
export const PLAN = {
  limit: 125,
  ogeler: [
    { key: 'okul', harf: 'O', ad: 'Okul', renk: '#d98a1f', taban: 20, tur: 'yapi', erisim: true },
    { key: 'hastane', harf: 'H', ad: 'Hastane', renk: '#d0392b', taban: 30, tur: 'yapi', erisim: true },
    { key: 'konut', harf: 'K', ad: 'Yeni konutlar', renk: '#7a5ac0', taban: 25, tur: 'yapi' },
    { key: 'park', harf: 'P', ad: 'Taşkın parkı', renk: '#2f7fe0', taban: 8, tur: 'sel' },
    { key: 'agac', harf: 'A', ad: 'Ağaçlandırma', renk: '#2f8f4f', taban: 6, tur: 'heyelan' },
  ],
  // Her öğe için: uygun mu, neden, maliyeti. Maliyet = taban + eğim payı + merkeze uzaklık (yol, altyapı) payı.
  evaluate(plan, buildings) {
    const out = { ogeler: {}, butce: 0, limit: PLAN.limit };
    for (const o of PLAN.ogeler) {
      const p = plan[o.key];
      if (!p) { out.ogeler[o.key] = { ok: false, neden: 'Henüz yerleştirilmedi.', maliyet: 0 }; continue; }
      const r = riskAt(p.x, p.z), uzak = Math.hypot(p.x - MERKEZ.x, p.z - MERKEZ.z), km = (uzak * M_PER_UNIT / 1000).toFixed(1);
      let ok = true, neden, maliyet = o.taban;
      if (o.tur === 'yapi') {
        maliyet += Math.round(slopeAt(p.x, p.z) * 60) + Math.max(0, Math.round((uzak - 150) * 0.08));
        const dolu = buildings.some((b) => Math.abs(b.x - p.x) < b.w / 2 + 9 && Math.abs(b.z - p.z) < b.d / 2 + 9);
        if (r === 'su') { ok = false; neden = 'Burası su; yapı kurulamaz.'; }
        else if (r === 'sel') { ok = false; neden = 'Sel riski taşıyan alanda (haritada mavi). Düşük riskli bir yer seç.'; }
        else if (r === 'heyelan') { ok = false; neden = 'Heyelan riski taşıyan yamaçta (haritada kırmızı). Düşük riskli bir yer seç.'; }
        else if (dolu) { ok = false; neden = 'Burada zaten yapılar var. Boş bir arsa seç.'; }
        else if (o.erisim && uzak > 230) { ok = false; neden = `Şehir merkezine ${km} km; çok uzak. İnsanlar kolay ulaşabilmeli.`; }
        else neden = `Düşük riskli, boş ve merkeze ${km} km.`;
      } else if (r !== o.tur) {
        ok = false;
        neden = o.tur === 'sel' ? 'Taşkın parkı, ırmağın taşkın alanına (haritada mavi) kurulmalı.' : 'Ağaçlandırma, heyelan riskli dik yamaca (haritada kırmızı) yapılmalı.';
      } else neden = o.tur === 'sel' ? 'Taşkın yatağı park olunca su taşsa da can ve mal kaybı olmaz.' : 'Ağaç kökleri yamaçtaki toprağı tutacak.';
      out.ogeler[o.key] = { ok, neden, maliyet };
      out.butce += maliyet;
    }
    out.butceOk = out.butce <= PLAN.limit;
    out.gecti = out.butceOk && PLAN.ogeler.every((o) => out.ogeler[o.key].ok);
    return out;
  },
};

// 4. bölüm deneyleri: değişkenleri seç, dene, hedefleri tamamla

// 4. bölüm deneyleri: değişkenleri seç, dene, hedefleri tamamla
export const LABS = {
  'deney-sel': {
    kod: 'B4E1', cizim: 'sel', baslik: 'Yağmur deneyi: Irmak ne zaman taşar?',
    giris: 'Yağışı ve yamacın örtüsünü seç, sonra deneyi başlat. Aşağıdaki iki görevi tamamla.',
    degiskenler: [
      { key: 'yagis', ad: 'Yağış', secenekler: [['az', 'Az'], ['orta', 'Orta'], ['siddetli', 'Şiddetli']] },
      { key: 'ortu', ad: 'Yamaç', secenekler: [['orman', 'Ormanlık'], ['ciplak', 'Çıplak toprak'], ['beton', 'Beton ve asfalt']] },
    ],
    // akış = yağış × yüzeyden akan pay
    sim: (v) => {
      const akis = { az: 1, orta: 2, siddetli: 3 }[v.yagis] * { orman: 0.45, ciplak: 0.8, beton: 1 }[v.ortu];
      return { kotu: akis >= 2.2, seviye: akis / 2.2, sonuc: akis >= 2.2 ? 'Irmak taştı! Ev su altında.' : akis >= 1.5 ? 'Irmak yükseldi ama taşmadı.' : 'Irmak sakin, taşmadı.' };
    },
    hedefler: [
      { metin: 'Irmağı taşıran bir durum bul', test: (d) => d.some((t) => t.kotu) },
      { metin: 'Şiddetli yağışta ırmağın taşmadığı bir durum bul', test: (d) => d.some((t) => !t.kotu && t.v.yagis === 'siddetli') },
    ],
    bitis: 'İki görevi de tamamladın. Aynı yağmur, yüzeye göre çok farklı sonuç veriyor: su toprağa sızamazsa ırmağa koşar.',
    defter: ['Sel nasıl oluşur?', 'Şiddetli yağışta su toprağa sızamazsa yüzeyden hızla ırmağa akar ve ırmak taşar. Orman suyu tutar; çıplak toprak ve beton tutmaz.'],
  },
  'deney-heyelan': {
    kod: 'B4E2', cizim: 'heyelan', baslik: 'Yamaç deneyi: Toprak ne zaman kayar?',
    giris: 'Eğimi, bitki örtüsünü ve toprağın ıslaklığını seç, sonra deneyi başlat. İki görevi tamamla.',
    degiskenler: [
      { key: 'egim', ad: 'Eğim', secenekler: [['az', 'Az'], ['orta', 'Orta'], ['dik', 'Dik']] },
      { key: 'ortu', ad: 'Bitki örtüsü', secenekler: [['agacli', 'Ağaçlı'], ['agacsiz', 'Ağaçsız']] },
      { key: 'su', ad: 'Toprak', secenekler: [['kuru', 'Kuru'], ['islak', 'Yağıştan ıslak']] },
    ],
    // kayma eğilimi = eğim + ıslaklık − köklerin tutuşu
    sim: (v) => {
      const p = { az: 1, orta: 2, dik: 3 }[v.egim] + (v.su === 'islak' ? 1.5 : 0) - (v.ortu === 'agacli' ? 1.5 : 0);
      return { kotu: p >= 3, seviye: p / 3, sonuc: p >= 3 ? 'Heyelan! Toprak ve ev aşağı kaydı.' : p >= 2 ? 'Yamaç zorlandı ama yerinde kaldı.' : 'Yamaç sağlam, toprak yerinde.' };
    },
    hedefler: [
      { metin: 'Heyelan oluşturan bir durum bul', test: (d) => d.some((t) => t.kotu) },
      { metin: 'Orta ya da dik eğimde, toprak ıslakken heyelan OLMAYAN bir durum bul', test: (d) => d.some((t) => !t.kotu && t.v.egim !== 'az' && t.v.su === 'islak') },
    ],
    bitis: 'İki görevi de tamamladın. Eğim, su ve ağaç kökleri birlikte belirliyor: kökler toprağı tutar, su toprağı ağırlaştırıp kayganlaştırır.',
    defter: ['Heyelan nasıl oluşur?', 'Dik yamaçta toprak yağışla ıslanıp ağırlaşır. Ağaç kökleri toprağı tutar; ağaçlar kesilirse ıslak toprak aşağı kayar. Buna heyelan denir.'],
  },
};

// 3. bölüm katman masasındaki yerler; "dogru" değeri arazi modelindeki risk sınıfıyla aynıdır

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

CLOZE.ozet4 = {
  baslik: 'Deneylerden öğrendiklerini özetle',
  defter: 'Deney özetim',
  parcalar: [
    'Şiddetli yağmurda su toprağa sızamazsa yüzeyden ', { sec: ['buharlaşır', 'akar'], dogru: 'akar' }, ' ve ırmak ',
    { sec: ['taşar', 'kurur'], dogru: 'taşar' }, '. Ormanlar suyu tutarak ', { sec: ['deprem', 'sel'], dogru: 'sel' },
    ' riskini azaltır. Dik, ıslak ve ağaçsız yamaçlarda toprak ', { sec: ['sertleşir', 'kayar'], dogru: 'kayar' }, '; buna ',
    { sec: ['çığ', 'heyelan', 'kuraklık'], dogru: 'heyelan' }, ' denir.',
  ],
  serbest: 'Yamaca ev yapmak isteyen birine bir cümleyle ne söylerdin?',
};

CLOZE.ozet5 = {
  baslik: 'Planlama kararlarını özetle',
  defter: 'Plan özetim',
  parcalar: [
    'Okul ve hastane gibi yapılar ', { sec: ['ırmak kenarındaki', 'düşük riskli', 'dik yamaçtaki'], dogru: 'düşük riskli' }, ' yerlere kurulmalıdır. Taşkın yatağı ',
    { sec: ['konut', 'park', 'hastane'], dogru: 'park' }, ' olarak kullanılırsa su taşınca zarar az olur. Dik yamaçlar ',
    { sec: ['ev yapılarak', 'ağaçlandırılarak'], dogru: 'ağaçlandırılarak' }, ' korunur. Plan yaparken güvenlik, erişim ve ',
    { sec: ['hava durumu', 'bütçe'], dogru: 'bütçe' }, ' birlikte düşünülür.',
  ],
  serbest: 'Belediye başkanı olsaydın şehrini afetlere karşı korumak için ilk ne yapardın? Neden?',
};

export const FARKLAR = [
  { ...RISKS.taskin, r: 48, metin: 'Irmak kenarı: Eskiden boş olan taşkın yatağına evler yapılmış.' },
  { ...RISKS.yamac, r: 40, metin: 'Boztepe yamacı: Ağaçlar kesilmiş, dik yamaca evler yapılmış.' },
  { ...RISKS.orman, r: 48, metin: 'Güney yamaçlar: Orman kesilip açılmış, yerine birkaç ev yapılmış.' },
];
