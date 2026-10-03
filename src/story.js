import { PLACES } from './terrain.js';

export const CHAPTER = { no: 1, ad: 'Kayıp Harita', rozet: 'Harita Çırağı' };

// Her adım: hedefe git, E ile etkileşime gir, diyaloğu dinle, soruyu yanıtla.
// "acar": harita üzerinde açılan bölge [minX, maxX, minZ, maxZ] (yok = değişmez).
export const STEPS = [
  {
    id: 'usta', hedef: PLACES.iskele, tur: 'npc',
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
      ['Hasan Usta', 'Yaklaşınca parçanın ışığını görürsün. Takılırsan H tuşuyla ipucu isteyebilirsin.'],
    ],
  },
  {
    id: 'tasbasi', hedef: PLACES.tasbasi, tur: 'parca', acar: [-450, 20, -450, 100],
    gorev: 'Taşbaşı\'ndaki ilk harita parçasını bul (iskelenin batısı, ~600 m)',
    once: [['Sen', 'İşte ilk parça! Kıyı çizgisi ve Boztepe\'nin etekleri çizilmiş.']],
    soru: {
      id: 'B1S2', beceri: 'Harita okuma',
      metin: 'Haritalarda, başka bir işaret yoksa üst kenar hangi yönü gösterir?',
      secenekler: ['Doğu', 'Kuzey', 'Güney', 'Batı'], dogru: 1,
      aciklama: 'Haritaların üst kenarı kuzeyi gösterir. Böylece sağ taraf doğu, sol taraf batı, alt taraf güney olur.',
    },
    sonra: [
      ['Hasan Usta (telsiz)', 'Harika! M tuşuyla haritanı açabilirsin. Altındaki ölçek çubuğu, haritadaki uzunluğun gerçekte kaç metre olduğunu söyler.'],
      ['Hasan Usta (telsiz)', 'İkinci parça Melet Irmağı\'nın üzerindeki köprüde. Buradan DOĞU-GÜNEYDOĞU yönünde, yaklaşık 1,8 kilometre.'],
    ],
  },
  {
    id: 'kopru', hedef: PLACES.kopru, tur: 'parca', acar: [20, 450, -450, 100],
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
    id: 'findik', hedef: PLACES.findik, tur: 'parca', acar: [20, 450, 100, 450],
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
    id: 'boztepe', hedef: PLACES.boztepe, tur: 'parca', acar: [-450, 450, -450, 450],
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
      ['Hasan Usta (telsiz)', 'Haritayı tamamladın, kâşif! Ama haritaya iyi bak: düz alan bitince insanlar dere yataklarına ve dik yamaçlara ev yapmış.'],
      ['Hasan Usta (telsiz)', 'Sel ve heyelan, Ordu\'nun en büyük iki tehlikesi. Bir sonraki görevde şehre gökyüzünden bakıp bu tehlikeli yerleri arayacağız.'],
    ],
  },
];
