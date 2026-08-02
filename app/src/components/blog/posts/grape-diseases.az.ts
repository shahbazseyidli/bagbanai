import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "grape-diseases",
  locale: "az",
  title: "Üzümdə mildiu və oidium: tanıma, profilaktika, mübarizə",
  description:
    "Üzümdə mildiu ilə oidiumu ayırmağın yolu: yarpaqda yağlı ləkə, yoxsa unlu ərp? Hansı havada aktivləşirlər, profilaktika pəncərələri və mübarizə prinsipləri.",
  lead:
    "Fərq bir baxışda görünür: mildiu yarpağın üstündə sarımtıl «yağlı» ləkə salır, altında ağ məxməri örtük yaradır; oidium isə yarpağı və giləni boz-ağ unlu ərplə örtür. Hava da onları ayırır — mildiu yağışlı-isti şəraitdə partlayır, oidium quru istidə. Bu ikisi üzümlüyün əsas düşmənləridir və mübarizə pəncərələri fərqlidir.",
  minutes: 4,
  datePublished: "2026-08-02",
  dateModified: "2026-08-02",
  sections: [
    {
      heading: "Fərqləndirici əlamətlər",
      table: {
        headers: ["Əlamət", "Mildiu", "Oidium"],
        rows: [
          ["Yarpağın üstü", "Sarımtıl, «yağlı» görünən ləkə", "Boz-ağ unlu ərp"],
          ["Yarpağın altı", "Ağ, məxməri örtük (rütubətdə)", "Ərp hər iki üzdə ola bilər"],
          ["Gilə", "Tündləşir, büzüşür", "Ərplənir, böyüyəndə çatlayır"],
          ["Zoğlar", "Ləkə və deformasiya", "Ərp və qaralma izləri"],
          ["Sevdiyi hava", "Yağış, şeh, 20-25°C", "Quru, 25-30°C, kölgəli sıx çətir"],
        ],
      },
      paragraphs: [
        "Sadə yaddaş qaydası: yağlı ləkə + altda ağ tük = mildiu; unlu toz = oidium. Şübhə qalanda yarpağı işığa tutun — mildiu ləkəsi işıqda yarımşəffaf, yağ hopmuş kimi görünür. Oidiumun ərpini isə barmaqla silmək olur, yarpağın rəngi altında solğun qalır.",
      ],
    },
    {
      heading: "Hansı havada gözləməli?",
      paragraphs: [
        "Mildiu su ilə yaşayır: sporlar yaş yarpaqda cücərir. Yağışlı və şehli dövrlər — xüsusən 20-25°C ilə birlikdə — infeksiya pəncərəsidir; yarpaq 2-3 saat yaş qalıbsa, şərait yaranıb sayın. Yağışlı may-iyun ilin ən təhlükəli vaxtıdır.",
        "Oidium əksinə, yağış istəmir: quru, isti (25-30°C) hava və sıx, kölgəli çətir ona bəsdir. Ona görə quru iyul mildiu üçün sakit, oidium üçün aktiv dövrdür. Bir mövsümdə ikisi növbə ilə də gələ bilər — yağışlı yazın mildiusu quru yayın oidiumu ilə əvəzlənir.",
      ],
    },
    {
      heading: "Profilaktika müalicədən ucuzdur",
      bullets: [
        "Çətiri havalandırın: artıq zoğların qoparılması və salxım zonasında yarpaq seyrəltməsi hər iki xəstəliyin mikroiqlimini pozur.",
        "Kritik pəncərələr: çiçəkləmədən əvvəl və dərhal sonra — profilaktik işlərin ən vacib iki vaxtı.",
        "Sanitariya: keçən il xəstəlik olan sahədə payızda yarpaq və salxım qalıqlarını çıxarın — sporlar orada qışlayır.",
        "Sıx əkilmiş, alaqlı, budaqları yerə dəyən cərgə göbələk üçün hazır mühitdir.",
      ],
    },
    {
      heading: "Mübarizə prinsipi (preparat adı yox)",
      paragraphs: [
        "Bu yazıda qəsdən preparat adı yoxdur: bazar dəyişir, sortların həssaslığı fərqlidir, gözləmə müddəti (dərmanlama ilə yığım arası) isə ciddi məsuliyyət məsələsidir. Prinsiplər sabitdir: mildiu ilə iş yağış pəncərəsindən əvvəl görülür, infeksiyadan sonra yox; oidiumda kükürd əsaslı ənənəvi yanaşma və sistem vasitələr işlənir; eyni təsir mexanizmini dalbadal təkrarlamaq rezistentlik yetişdirir.",
        "Konkret preparatı, dozanı və gözləmə müddətini aqronomla və etiketlə təsdiqləyin. Bu, formallıq deyil — səhv doza və pozulmuş gözləmə müddəti həm məhsulu, həm alıcını vurur.",
      ],
    },
    {
      heading: "Mövsüm boyu risk təqvimi",
      table: {
        headers: ["Dövr", "Mildiu riski", "Oidium riski"],
        rows: [
          ["Aprel – may (zoğ boyu)", "Yağış düşərsə yüksək", "Aşağı-orta"],
          ["Çiçəkləmə", "Ən həssas pəncərə", "Ən həssas pəncərə"],
          ["İyun (gilə bağlama)", "Yağışdan asılı", "İstidə artır"],
          ["İyul – avqust (quru isti)", "Adətən sakit", "Ən aktiv dövr"],
        ],
      },
      paragraphs: [
        "Cədvəlin əsas mesajı: iki xəstəliyin pikləri üst-üstə düşmür. Yağışlı mayda diqqət mildiuda, quru iyulda oidiumda olmalıdır — çiçəkləmə isə hər ikisi üçün ortaq və ən həssas pəncərədir. Sortlar da eyni deyil: bəzi süfrə sortları oidiuma xüsusilə həssasdır, ona görə qonşu bağın təcrübəsini öz sortunuza kor-koranə köçürməyin.",
      ],
    },
    {
      heading: "Peyk bu işdə nə görür, nə görmür?",
      paragraphs: [
        "Dürüst cavab: NDVI mildiu ocağını tapmır. Erkən ocaq bir neçə tənəkdir, peykin pikseli isə 10 metrdir — xəstəlik peykdə seçiləndə artıq yayılıb. Peykin real faydası başqadır: sahənin hansı zonasının ümumi stress göstərdiyini erkən bildirir və yoxlamanı ünvanlı edir — kor-koranə gəzmək əvəzinə zəifləyən künclərə baxırsınız.",
        "Agradex-də bunun davamı foto-diaqnozdur: şübhəli yarpağın şəklini çəkirsiniz, sistem əlamətlərə görə ehtimal olunan səbəbi və növbəti addımı yazır, müşahidə sahənin tarixçəsində qalır. Qəti diaqnoz yenə yerdə qoyulur — amma «hara gedib nəyə baxmaq» sualı cavablı olur.",
      ],
    },
  ],
  related: ["ndvi-crop-disease", "what-is-ndvi"],
};
