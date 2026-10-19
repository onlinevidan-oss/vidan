-- 47 барааны SEO талбарыг бөглөнө (migration 0042-т нэмсэн багануудад).
--
-- ЧУХАЛ: `name_mn` буюу вэб дээр харагдах барааны нэрийг ОГТ ХӨНДӨХГҮЙ.
-- Зөвхөн хайлтад зориулсан гурван талбар:
--   meta_title       → <title> ба og:title
--   meta_description → хайлтын үр дүнд харагдах тайлбар
--   search_keywords  → сайтын дотоод хайлт + JSON-LD (зөвхөн сервер талд)
--
-- Түлхүүр үгс нь монгол кирилл, орос, латин галиг гурван бичлэгтэй —
-- хэрэглэгч "огурцы", "orgost hemh", "даршилсан өргөст хэмх" аль нь ч
-- бичсэн бараа олдоно.
--
-- id-гаар шинэчилдэг тул дахин ажиллуулахад аюулгүй.

begin;

-- Аджика 180г
update public.products set
  meta_title = 'Аджика 180г — хоолны амтлагч',
  meta_description = 'VIDAN аджика 180г. 2018 онд Юнэскогийн соёлын өвд бүртгэгдсэн Гүрж улсын жороор үйлдвэрлэсэн халуун ногоотой амтлагч, соус. Улаанбаатарт хүргэнэ.',
  search_keywords = 'аджика, хоолны амтлагч, амтлагч, соус, vidan, аджика 180г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, острый соус, приправа, специи, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, adjika, ajika, adzhika, hoolnii amtlagch, amtlagch, sous, widan, adjika 180g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '46f444aa-6435-4032-8e91-6991f0b2ebab';

-- Алим, Бөөрөлзгөнө органик 200г
update public.products set
  meta_title = 'Алим, Бөөрөлзгөнө органик 200г — жимсний нухаш',
  meta_description = 'Owolovo алим, Бөөрөлзгөнө органик 200г. Польш улсаас оруулж ирсэн төрөл бүрийн органик жимс жимсгэний нухаш. Улаанбаатарт хүргэнэ.',
  search_keywords = 'алим, бөөрөлзгөн, органик, жимсний нухаш, нэмэлтгүй нухаш, owolovo, алим, бөөрөлзгөнө органик 200г, vidan, видан, видан онлайн дэлгүүр, польшоос, импортын бүтээгдэхүүн, европын бүтээгдэхүүн, яблоко, яблочное, яблочный, яблоки, малина, малиновый, органический, эко, био, фруктовое пюре, пюре, оволово, vidan монголия, купить в улан-баторе, из польши, импорт, европейский продукт, alim, alimnii, boorolzgono, boorolzgon, organik, organic, jimsnii nuhash, nuhash, ovolovo, alim boorolzgono organik 200g, vidan mn, vidan mongolia, polshoos, importiin, evropiin'
where id = 'efa3cb11-f950-4148-8414-eec4233493cb';

-- Алим, Гүзээлзгэнэ 200г
update public.products set
  meta_title = 'Алим, Гүзээлзгэнэ 200г — жимсний нухаш',
  meta_description = 'Owolovo алим, Гүзээлзгэнэ 200г. Польш улсаас оруулж ирсэн төрөл бүрийн органик жимс жимсгэний нухаш. Улаанбаатарт хүргэнэ.',
  search_keywords = 'алим, гүзээлзгэн, жимсний нухаш, нэмэлтгүй нухаш, owolovo, алим, гүзээлзгэнэ 200г, vidan, видан, видан онлайн дэлгүүр, польшоос, импортын бүтээгдэхүүн, европын бүтээгдэхүүн, яблоко, яблочное, яблочный, яблоки, клубника, клубничный, клубничное, фруктовое пюре, пюре, оволово, vidan монголия, купить в улан-баторе, из польши, импорт, европейский продукт, alim, alimnii, guzeelzgene, guzeelzgen, guzeelzgenii, jimsnii nuhash, nuhash, ovolovo, alim guzeelzgene 200g, vidan mn, vidan mongolia, polshoos, importiin, evropiin'
where id = 'db64ab10-b206-4ec9-a937-b94838929c1f';

-- Алим, Интоор органик 200г
update public.products set
  meta_title = 'Алим, Интоор органик 200г — жимсний нухаш',
  meta_description = 'Owolovo алим, Интоор органик 200г. Польш улсаас оруулж ирсэн төрөл бүрийн органик жимс жимсгэний нухаш. Улаанбаатарт хүргэнэ.',
  search_keywords = 'алим, интоор, органик, жимсний нухаш, нэмэлтгүй нухаш, owolovo, алим, интоор органик 200г, vidan, видан, видан онлайн дэлгүүр, польшоос, импортын бүтээгдэхүүн, европын бүтээгдэхүүн, яблоко, яблочное, яблочный, яблоки, вишня, вишнёвый, вишневый, органический, эко, био, фруктовое пюре, пюре, оволово, vidan монголия, купить в улан-баторе, из польши, импорт, европейский продукт, alim, alimnii, intoor, intooriin, organik, organic, jimsnii nuhash, nuhash, ovolovo, alim intoor organik 200g, vidan mn, vidan mongolia, polshoos, importiin, evropiin'
where id = '59ee59c0-ef2e-41b7-900d-f57d5ab5a087';

-- Алим, Лууван нухаш 720г
update public.products set
  meta_title = 'Алим, Лууван нухаш 720г — жимсний нухаш',
  meta_description = 'VIDAN алим, Лууван нухаш 720г. Польш улсаас оруулж ирсэн алимаар эх орондоо үйлдвэрлэсэн алимны нухаш. Улаанбаатарт хүргэнэ.',
  search_keywords = 'алим, лууван, нухаш, жимсний нухаш, нэмэлтгүй нухаш, vidan, алим, лууван нухаш 720г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, яблоко, яблочное, яблочный, яблоки, морковь, морковный, морковное, пюре, фруктовое пюре, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, alim, alimnii, luuvan, luuvang, luuwan, nuhash, nukhash, jimsnii nuhash, widan, alim luuvan nuhash 720g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '2e93d408-63d1-40a0-b293-d6de32e7d45d';

-- Алим, Лууван органик 200г
update public.products set
  meta_title = 'Алим, Лууван органик 200г — жимсний нухаш',
  meta_description = 'Owolovo алим, Лууван органик 200г. Польш улсаас оруулж ирсэн төрөл бүрийн органик жимс жимсгэний нухаш. Улаанбаатарт хүргэнэ.',
  search_keywords = 'алим, лууван, органик, жимсний нухаш, нэмэлтгүй нухаш, owolovo, алим, лууван органик 200г, vidan, видан, видан онлайн дэлгүүр, польшоос, импортын бүтээгдэхүүн, европын бүтээгдэхүүн, яблоко, яблочное, яблочный, яблоки, морковь, морковный, морковное, органический, эко, био, фруктовое пюре, пюре, оволово, vidan монголия, купить в улан-баторе, из польши, импорт, европейский продукт, alim, alimnii, luuvan, luuvang, luuwan, organik, organic, jimsnii nuhash, nuhash, ovolovo, alim luuvan organik 200g, vidan mn, vidan mongolia, polshoos, importiin, evropiin'
where id = 'f23bae95-48d4-477d-a53a-307cc8cefea0';

-- Алим, Тоор 200г
update public.products set
  meta_title = 'Алим, Тоор 200г — жимсний нухаш',
  meta_description = 'Owolovo алим, Тоор 200г. Польш улсаас оруулж ирсэн төрөл бүрийн органик жимс жимсгэний нухаш. Улаанбаатарт хүргэнэ.',
  search_keywords = 'алим, тоор, жимсний нухаш, нэмэлтгүй нухаш, owolovo, алим, тоор 200г, vidan, видан, видан онлайн дэлгүүр, польшоос, импортын бүтээгдэхүүн, европын бүтээгдэхүүн, яблоко, яблочное, яблочный, яблоки, персик, персиковый, фруктовое пюре, пюре, оволово, vidan монголия, купить в улан-баторе, из польши, импорт, европейский продукт, alim, alimnii, toor, tooriin, jimsnii nuhash, nuhash, ovolovo, alim toor 200g, vidan mn, vidan mongolia, polshoos, importiin, evropiin'
where id = '59ea008c-1d83-4768-860b-994faaaa5aa0';

-- Алим, Чангаанз 200г
update public.products set
  meta_title = 'Алим, Чангаанз 200г — жимсний нухаш',
  meta_description = 'Owolovo алим, Чангаанз 200г. Польш улсаас оруулж ирсэн төрөл бүрийн органик жимс жимсгэний нухаш. Улаанбаатарт хүргэнэ.',
  search_keywords = 'алим, чангаанз, жимсний нухаш, нэмэлтгүй нухаш, owolovo, алим, чангаанз 200г, vidan, видан, видан онлайн дэлгүүр, польшоос, импортын бүтээгдэхүүн, европын бүтээгдэхүүн, яблоко, яблочное, яблочный, яблоки, абрикос, абрикосовый, фруктовое пюре, пюре, оволово, vidan монголия, купить в улан-баторе, из польши, импорт, европейский продукт, alim, alimnii, changaanz, changaanzan, jimsnii nuhash, nuhash, ovolovo, alim changaanz 200g, vidan mn, vidan mongolia, polshoos, importiin, evropiin'
where id = '40c4e2ef-673a-412e-80ed-62c198228c4b';

-- Алимны нухаш 200г
update public.products set
  meta_title = 'Алимны нухаш 200г — жимсний нухаш',
  meta_description = 'Owolovo алимны нухаш 200г. Польш улсаас оруулж ирсэн төрөл бүрийн органик жимс жимсгэний нухаш. Улаанбаатарт хүргэнэ.',
  search_keywords = 'алим, нухаш, жимсний нухаш, нэмэлтгүй нухаш, owolovo, алимны нухаш 200г, vidan, видан, видан онлайн дэлгүүр, польшоос, импортын бүтээгдэхүүн, европын бүтээгдэхүүн, яблоко, яблочное, яблочный, яблоки, пюре, фруктовое пюре, оволово, vidan монголия, купить в улан-баторе, из польши, импорт, европейский продукт, alim, alimnii, nuhash, nukhash, jimsnii nuhash, ovolovo, alimny nuhash 200g, vidan mn, vidan mongolia, polshoos, importiin, evropiin'
where id = 'ad9b15c7-d4dc-4807-91e3-fa32482743e2';

-- Алимны нухаш 200г
update public.products set
  meta_title = 'Алимны нухаш 200г — жимсний нухаш',
  meta_description = 'Owolovo алимны нухаш 200г. Польш улсаас оруулж ирсэн төрөл бүрийн органик жимс жимсгэний нухаш. Улаанбаатарт хүргэнэ.',
  search_keywords = 'алим, нухаш, жимсний нухаш, нэмэлтгүй нухаш, owolovo, алимны нухаш 200г, vidan, видан, видан онлайн дэлгүүр, польшоос, импортын бүтээгдэхүүн, европын бүтээгдэхүүн, яблоко, яблочное, яблочный, яблоки, пюре, фруктовое пюре, оволово, vidan монголия, купить в улан-баторе, из польши, импорт, европейский продукт, alim, alimnii, nuhash, nukhash, jimsnii nuhash, ovolovo, alimny nuhash 200g, vidan mn, vidan mongolia, polshoos, importiin, evropiin'
where id = 'e74de0fb-1d2d-45f0-9091-680b68b439c9';

-- Алимны нухаш 720г
update public.products set
  meta_title = 'Алимны нухаш 720г — жимсний нухаш',
  meta_description = 'VIDAN алимны нухаш 720г. Польш улсаас оруулж ирсэн алимаар эх орондоо үйлдвэрлэсэн алимны нухаш. Улаанбаатарт хүргэнэ.',
  search_keywords = 'алим, нухаш, жимсний нухаш, нэмэлтгүй нухаш, vidan, алимны нухаш 720г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, яблоко, яблочное, яблочный, яблоки, пюре, фруктовое пюре, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, alim, alimnii, nuhash, nukhash, jimsnii nuhash, widan, alimny nuhash 720g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '77df4ef6-f334-4344-9172-726352d183a2';

-- Алимны нухаш 900г
update public.products set
  meta_title = 'Алимны нухаш 900г — жимсний нухаш',
  meta_description = 'VIDAN алимны нухаш 900г. Польш улсаас оруулж ирсэн алимаар эх орондоо үйлдвэрлэсэн алимны нухаш. Улаанбаатарт хүргэнэ.',
  search_keywords = 'алим, нухаш, жимсний нухаш, нэмэлтгүй нухаш, vidan, алимны нухаш 900г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, яблоко, яблочное, яблочный, яблоки, пюре, фруктовое пюре, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, alim, alimnii, nuhash, nukhash, jimsnii nuhash, widan, alimny nuhash 900g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '7b5d018a-f3aa-4285-ae45-fd7beea532bf';

-- Алимхан алим, лууван нухаш 180г
update public.products set
  meta_title = 'Алимхан алим, лууван нухаш 180г — жимсний нухаш',
  meta_description = 'Алимхан алим, лууван нухаш 180г. Польш улсаас оруулж ирсэн алимаар эх орондоо үйлдвэрлэсэн алимны нухаш. Улаанбаатарт хүргэнэ.',
  search_keywords = 'алим, лууван, нухаш, жимсний нухаш, нэмэлтгүй нухаш, алимхан, алимхан алим, лууван нухаш 180г, хүүхдийн нухаш, хүүхдийн хүнс, vidan, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, яблоко, яблочное, яблочный, яблоки, морковь, морковный, морковное, пюре, фруктовое пюре, детское пюре, детское питание, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, alim, alimnii, luuvan, luuvang, luuwan, nuhash, nukhash, jimsnii nuhash, alimhan, alimkhan, alimhan alim luuvan nuhash 180g, huuhdiin nuhash, huuhdiin huns, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = 'c3e56b70-4226-4027-a42d-403148186bf3';

-- Алимхан алимны нухаш 180г
update public.products set
  meta_title = 'Алимхан алимны нухаш 180г — жимсний нухаш',
  meta_description = 'Алимхан алимны нухаш 180г. Польш улсаас оруулж ирсэн алимаар эх орондоо үйлдвэрлэсэн алимны нухаш. Улаанбаатарт хүргэнэ.',
  search_keywords = 'алим, нухаш, жимсний нухаш, нэмэлтгүй нухаш, алимхан, алимхан алимны нухаш 180г, хүүхдийн нухаш, хүүхдийн хүнс, vidan, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, яблоко, яблочное, яблочный, яблоки, пюре, фруктовое пюре, детское пюре, детское питание, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, alim, alimnii, nuhash, nukhash, jimsnii nuhash, alimhan, alimkhan, alimhan alimny nuhash 180g, huuhdiin nuhash, huuhdiin huns, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '8c2ddf67-02cf-4047-a620-b34bbb6dd65d';

-- Алимхан нэмэлт чихэргүй алимны нухаш 180г
update public.products set
  meta_title = 'Алимхан нэмэлт чихэргүй алимны нухаш 180г',
  meta_description = 'Алимхан нэмэлт чихэргүй алимны нухаш 180г. Польш улсаас оруулж ирсэн алимаар эх орондоо үйлдвэрлэсэн алимны нухаш. Улаанбаатарт хүргэнэ.',
  search_keywords = 'алим, нухаш, нэмэлт чихэргүй, жимсний нухаш, нэмэлтгүй нухаш, алимхан, алимхан нэмэлт чихэргүй алимны нухаш 180г, хүүхдийн нухаш, хүүхдийн хүнс, vidan, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, яблоко, яблочное, яблочный, яблоки, пюре, фруктовое пюре, без сахара, без добавления сахара, детское пюре, детское питание, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, alim, alimnii, nuhash, nukhash, nemelt chihergui, chihergui, jimsnii nuhash, alimhan, alimkhan, alimhan nemelt chihergui alimny nuhash 180g, huuhdiin nuhash, huuhdiin huns, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '31160a36-1f52-40d1-87e2-5bd9fd9e3e15';

-- Амтат салат 550г
update public.products set
  meta_title = 'Амтат салат 550г — даршилсан ногоо',
  meta_description = 'VIDAN амтат салат 550г. Эх орны хөрсөнд ургуулсан ногоогоор Европ технологиор боловсруулсан. Улаанбаатарт хүргэнэ.',
  search_keywords = 'салат, даршилсан ногоо, лаазалсан ногоо, нөөшилсөн ногоо, дарш, бэлэн салат, vidan, амтат салат 550г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, салаты, закуска, консервированные овощи, маринованные овощи, соленья, консервы, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, salat, salad, darshilsan nogoo, laazalsan nogoo, nooshilson nogoo, belen salat, widan, amtat salat 550g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = 'f26b6923-cf54-4d34-9a39-e2b2c8aabb46';

-- Гүзээлзгэний чанамал 350г
update public.products set
  meta_title = 'Гүзээлзгэний чанамал 350г — жимсний чанамал',
  meta_description = 'VIDAN гүзээлзгэний чанамал 350г. Польш улсаас оруулж ирсэн жимс жимсгэнээр үйлдвэрлэсэн чанамал. Улаанбаатарт хүргэнэ.',
  search_keywords = 'гүзээлзгэн, чанамал, жимсний чанамал, жэм, vidan, гүзээлзгэний чанамал 350г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, клубника, клубничный, клубничное, варенье, джем, конфитюр, фруктовое варенье, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, guzeelzgene, guzeelzgen, guzeelzgenii, chanamal, chanamalt, jimsnii chanamal, jem, widan, guzeelzgenii chanamal 350g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = 'eb421b51-f59e-449d-aa44-ee20e6dadb1d';

-- Зөгийн бал 350г
update public.products set
  meta_title = 'Зөгийн бал 350г — байгалийн цэвэр',
  meta_description = 'VIDAN зөгийн бал 350г. Үйлдвэрийн аргаар гаргаж авсан зөгийн бал. Улаанбаатарт хүргэнэ.',
  search_keywords = 'зөгийн бал, байгалийн бал, цэвэр зөгийн бал, бал, vidan, зөгийн бал 350г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, мёд, мед, натуральный мёд, пчелиный мёд, пчелиный мед, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, zogiin bal, zugiin bal, zogiyn bal, bal, med, myod, baigaliin bal, tsever zogiin bal, widan, zogiin bal 350g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = 'fdaddcd2-6f14-4c6d-9c12-fdeddba5152a';

-- Зөгийн бал 920г
update public.products set
  meta_title = 'Зөгийн бал 920г — байгалийн цэвэр',
  meta_description = 'VIDAN зөгийн бал 920г. Үйлдвэрийн аргаар гаргаж авсан зөгийн бал. Улаанбаатарт хүргэнэ.',
  search_keywords = 'зөгийн бал, байгалийн бал, цэвэр зөгийн бал, бал, vidan, зөгийн бал 920г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, мёд, мед, натуральный мёд, пчелиный мёд, пчелиный мед, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, zogiin bal, zugiin bal, zogiyn bal, bal, med, myod, baigaliin bal, tsever zogiin bal, widan, zogiin bal 920g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = 'def40dab-da67-448b-8dce-dd456a15080a';

-- Илчлэг салат 550г
update public.products set
  meta_title = 'Илчлэг салат 550г — даршилсан ногоо',
  meta_description = 'VIDAN илчлэг салат 550г. Эх орны хөрсөнд ургуулсан ногоогоор Европ технологиор боловсруулсан. Улаанбаатарт хүргэнэ.',
  search_keywords = 'салат, даршилсан ногоо, лаазалсан ногоо, нөөшилсөн ногоо, дарш, бэлэн салат, vidan, илчлэг салат 550г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, салаты, закуска, консервированные овощи, маринованные овощи, соленья, консервы, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, salat, salad, darshilsan nogoo, laazalsan nogoo, nooshilson nogoo, belen salat, widan, ilchleg salat 550g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '27226ab1-ef43-4e50-b9fc-9d08f5afa2fc';

-- Интоорын компот 740г
update public.products set
  meta_title = 'Интоорын компот 740г — жимсний компот',
  meta_description = 'VIDAN интоорын компот 740г. Польш улсаас оруулж ирсэн жимс жимсгэнээр үйлдвэрлэсэн компот. Улаанбаатарт хүргэнэ.',
  search_keywords = 'интоор, компот, жимсний компот, лаазалсан жимс, vidan, интоорын компот 740г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, вишня, вишнёвый, вишневый, компоты, консервированные фрукты, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, intoor, intooriin, kompot, compote, kompott, jimsnii kompot, widan, intooryn kompot 740g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = 'fac384d2-3f13-47e9-8d33-5e64472fd9ab';

-- Интоорын чанамал 350г
update public.products set
  meta_title = 'Интоорын чанамал 350г — жимсний чанамал',
  meta_description = 'VIDAN интоорын чанамал 350г. Польш улсаас оруулж ирсэн жимс жимсгэнээр үйлдвэрлэсэн чанамал. Улаанбаатарт хүргэнэ.',
  search_keywords = 'интоор, чанамал, жимсний чанамал, жэм, vidan, интоорын чанамал 350г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, вишня, вишнёвый, вишневый, варенье, джем, конфитюр, фруктовое варенье, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, intoor, intooriin, chanamal, chanamalt, jimsnii chanamal, jem, widan, intooryn chanamal 350g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = 'cdb9cbcc-a24f-4ee6-9af7-70a953a3f3aa';

-- Мангас өргөст хэмх 720г
update public.products set
  meta_title = 'Мангас өргөст хэмх 720г — даршилсан ногоо',
  meta_description = 'Мангас өргөст хэмх 720г. халуун чинжүүтэй өргөст хэмх. Улаанбаатарт хүргэнэ.',
  search_keywords = 'өргөст хэмх, даршилсан ногоо, лаазалсан ногоо, нөөшилсөн ногоо, дарш, бэлэн салат, мангас, мангас өргөст хэмх 720г, даршилсан өргөст хэмх, дарштай өргөст хэмх, лаазалсан өргөст хэмх, vidan, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, огурец, огурцы, огурцов, солёные огурцы, соленые огурцы, маринованные огурцы, консервированные овощи, маринованные овощи, соленья, консервы, солёные огурцы банка, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, orgost hemh, urgust hemh, orgost khemkh, urgust khemkh, ogurts, ogurtsi, ogurtsy, orgost hemkh, darshilsan nogoo, laazalsan nogoo, nooshilson nogoo, belen salat, mangas, mangass, mangas orgost hemh 720g, darshilsan orgost hemh, darshilsan urgust hemh, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '60d45adf-641c-485e-9f2b-d4efa567ce53';

-- Махны Мангас 180г
update public.products set
  meta_title = 'Махны Мангас 180г — хоолны амтлагч',
  meta_description = 'Махны Мангас 180г. 2018 онд Юнэскогийн соёлын өвд бүртгэгдсэн Гүрж улсын жороор үйлдвэрлэсэн халуун ногоотой амтлагч, соус. Улаанбаатарт хүргэнэ.',
  search_keywords = 'махны, хоолны амтлагч, амтлагч, соус, мангас, махны мангас 180г, vidan, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, для мяса, мясной соус, приправа, специи, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, mahnii, makhnii, hoolnii amtlagch, amtlagch, sous, mangas, mangass, mahny mangas 180g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = 'c3422c4c-ffcc-489d-959c-673e53d85b5a';

-- Махны Мангас 350г
update public.products set
  meta_title = 'Махны Мангас 350г — хоолны амтлагч',
  meta_description = 'Махны Мангас 350г. 2018 онд Юнэскогийн соёлын өвд бүртгэгдсэн Гүрж улсын жороор үйлдвэрлэсэн халуун ногоотой амтлагч, соус. Улаанбаатарт хүргэнэ.',
  search_keywords = 'махны, хоолны амтлагч, амтлагч, соус, мангас, махны мангас 350г, vidan, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, для мяса, мясной соус, приправа, специи, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, mahnii, makhnii, hoolnii amtlagch, amtlagch, sous, mangas, mangass, mahny mangas 350g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = 'bd9107a8-432f-4077-b977-a6402a33e75a';

-- Мөөгтэй Лечо 550г
update public.products set
  meta_title = 'Мөөгтэй Лечо 550г — даршилсан ногоо',
  meta_description = 'VIDAN мөөгтэй Лечо 550г. Эх орны хөрсөнд ургуулсан ногоогоор Европ технологиор боловсруулсан. Улаанбаатарт хүргэнэ.',
  search_keywords = 'мөөг, лечо, даршилсан ногоо, лаазалсан ногоо, нөөшилсөн ногоо, дарш, бэлэн салат, vidan, мөөгтэй лечо 550г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, грибы, грибной, консервированные овощи, маринованные овощи, соленья, консервы, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, moog, mooeg, lecho, letcho, darshilsan nogoo, laazalsan nogoo, nooshilson nogoo, belen salat, widan, moogtei lecho 550g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = 'f21c338e-a30d-4ebb-ba1f-6f589350d75e';

-- Олон жимст чанамал 350г
update public.products set
  meta_title = 'Олон жимст чанамал 350г — жимсний чанамал',
  meta_description = 'VIDAN олон жимст чанамал 350г. Польш улсаас оруулж ирсэн жимс жимсгэнээр үйлдвэрлэсэн чанамал. Улаанбаатарт хүргэнэ.',
  search_keywords = 'олон жимс, чанамал, жимсний чанамал, жэм, vidan, олон жимст чанамал 350г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, ассорти, фруктовое ассорти, лесные ягоды, варенье, джем, конфитюр, фруктовое варенье, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, olon jimst, olon jims, chanamal, chanamalt, jimsnii chanamal, jem, widan, olon jimst chanamal 350g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '1c234a99-3208-48f8-a032-dd2c20af559c';

-- Өргөст хэмх 1700г
update public.products set
  meta_title = 'Даршилсан өргөст хэмх 1700г',
  meta_description = 'VIDAN өргөст хэмх 1700г. Эх орны хөрсөнд ургуулсан өргөст хэмхээр, Европ технологи ашиглан эх орондоо үйлдвэрлэсэн бүтээгдэхүүн. Улаанбаатарт хүргэнэ.',
  search_keywords = 'өргөст хэмх, даршилсан ногоо, лаазалсан ногоо, нөөшилсөн ногоо, дарш, бэлэн салат, vidan, өргөст хэмх 1700г, даршилсан өргөст хэмх, дарштай өргөст хэмх, лаазалсан өргөст хэмх, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, огурец, огурцы, огурцов, солёные огурцы, соленые огурцы, маринованные огурцы, консервированные овощи, маринованные овощи, соленья, консервы, солёные огурцы банка, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, orgost hemh, urgust hemh, orgost khemkh, urgust khemkh, ogurts, ogurtsi, ogurtsy, orgost hemkh, darshilsan nogoo, laazalsan nogoo, nooshilson nogoo, belen salat, widan, orgost hemh 1700g, darshilsan orgost hemh, darshilsan urgust hemh, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = 'a1868893-d85d-4705-970f-e137a3eef82c';

-- Өргөст хэмх 720г
update public.products set
  meta_title = 'Даршилсан өргөст хэмх 720г',
  meta_description = 'VIDAN өргөст хэмх 720г. Эх орны хөрсөнд ургуулсан өргөст хэмхээр, Европ технологи ашиглан эх орондоо үйлдвэрлэсэн бүтээгдэхүүн. Улаанбаатарт хүргэнэ.',
  search_keywords = 'өргөст хэмх, даршилсан ногоо, лаазалсан ногоо, нөөшилсөн ногоо, дарш, бэлэн салат, vidan, өргөст хэмх 720г, даршилсан өргөст хэмх, дарштай өргөст хэмх, лаазалсан өргөст хэмх, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, огурец, огурцы, огурцов, солёные огурцы, соленые огурцы, маринованные огурцы, консервированные овощи, маринованные овощи, соленья, консервы, солёные огурцы банка, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, orgost hemh, urgust hemh, orgost khemkh, urgust khemkh, ogurts, ogurtsi, ogurtsy, orgost hemkh, darshilsan nogoo, laazalsan nogoo, nooshilson nogoo, belen salat, widan, orgost hemh 720g, darshilsan orgost hemh, darshilsan urgust hemh, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '7c8ad773-0ec5-4a2b-a783-7408de6808ec';

-- Өргөст хэмх 920г
update public.products set
  meta_title = 'Даршилсан өргөст хэмх 920г',
  meta_description = 'VIDAN өргөст хэмх 920г. Эх орны хөрсөнд ургуулсан өргөст хэмхээр, Европ технологи ашиглан эх орондоо үйлдвэрлэсэн бүтээгдэхүүн. Улаанбаатарт хүргэнэ.',
  search_keywords = 'өргөст хэмх, даршилсан ногоо, лаазалсан ногоо, нөөшилсөн ногоо, дарш, бэлэн салат, vidan, өргөст хэмх 920г, даршилсан өргөст хэмх, дарштай өргөст хэмх, лаазалсан өргөст хэмх, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, огурец, огурцы, огурцов, солёные огурцы, соленые огурцы, маринованные огурцы, консервированные овощи, маринованные овощи, соленья, консервы, солёные огурцы банка, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, orgost hemh, urgust hemh, orgost khemkh, urgust khemkh, ogurts, ogurtsi, ogurtsy, orgost hemkh, darshilsan nogoo, laazalsan nogoo, nooshilson nogoo, belen salat, widan, orgost hemh 920g, darshilsan orgost hemh, darshilsan urgust hemh, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '58f560b2-9097-42b6-8de7-ed49ec1545df';

-- Өргөст хэмх Улаан лоольтой 920г
update public.products set
  meta_title = 'Даршилсан өргөст хэмх Улаан лоольтой 920г',
  meta_description = 'VIDAN өргөст хэмх Улаан лоольтой 920г. Эх орны хөрсөнд ургуулсан өргөст хэмхээр, Европ технологи ашиглан эх орондоо үйлдвэрлэсэн бүтээгдэхүүн. Улаанбаатарт хү',
  search_keywords = 'өргөст хэмх, улаан лооль, даршилсан ногоо, лаазалсан ногоо, нөөшилсөн ногоо, дарш, бэлэн салат, vidan, өргөст хэмх улаан лоольтой 920г, даршилсан өргөст хэмх, дарштай өргөст хэмх, лаазалсан өргөст хэмх, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, огурец, огурцы, огурцов, солёные огурцы, соленые огурцы, маринованные огурцы, помидор, помидоры, томат, томатный, консервированные овощи, маринованные овощи, соленья, консервы, солёные огурцы банка, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, orgost hemh, urgust hemh, orgost khemkh, urgust khemkh, ogurts, ogurtsi, ogurtsy, orgost hemkh, ulaan lool, ulaan looli, pomidor, tomat, darshilsan nogoo, laazalsan nogoo, nooshilson nogoo, belen salat, widan, orgost hemh ulaan looltoi 920g, darshilsan orgost hemh, darshilsan urgust hemh, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = 'f58147e2-b1bc-4f98-84bb-5f0b1eb5a831';

-- Өргөст хэмх Халуун чинжүүтэй 720г
update public.products set
  meta_title = 'Даршилсан өргөст хэмх Халуун чинжүүтэй 720г',
  meta_description = 'VIDAN өргөст хэмх Халуун чинжүүтэй 720г. Эх орны хөрсөнд ургуулсан өргөст хэмхээр, Европ технологи ашиглан эх орондоо үйлдвэрлэсэн бүтээгдэхүүн. Улаанбаатарт ',
  search_keywords = 'өргөст хэмх, халуун чинжүү, даршилсан ногоо, лаазалсан ногоо, нөөшилсөн ногоо, дарш, бэлэн салат, vidan, өргөст хэмх халуун чинжүүтэй 720г, даршилсан өргөст хэмх, дарштай өргөст хэмх, лаазалсан өргөст хэмх, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, огурец, огурцы, огурцов, солёные огурцы, соленые огурцы, маринованные огурцы, острый перец, перец чили, консервированные овощи, маринованные овощи, соленья, консервы, солёные огурцы банка, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, orgost hemh, urgust hemh, orgost khemkh, urgust khemkh, ogurts, ogurtsi, ogurtsy, orgost hemkh, haluun chinjuu, chinjuu, darshilsan nogoo, laazalsan nogoo, nooshilson nogoo, belen salat, widan, orgost hemh haluun chinjuutei 720g, darshilsan orgost hemh, darshilsan urgust hemh, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '4523ee55-cdfa-4e7d-a52a-de2f4765ab2c';

-- Сок Bunio 330мл Банана
update public.products set
  meta_title = 'Сок Bunio 330мл Банана — натурал шүүс',
  meta_description = 'Сок Bunio 330мл Банана. Нэмэлт чихэргүй натурал шүүс. Улаанбаатарт хүргэнэ.',
  search_keywords = 'банана, натурал шүүс, жимсний шүүс, шүүс, bunio, сок bunio 330мл банана, vidan, видан, видан онлайн дэлгүүр, польшоос, импортын бүтээгдэхүүн, европын бүтээгдэхүүн, банан, банановый, натуральный сок, фруктовый сок, сок, бунио, vidan монголия, купить в улан-баторе, из польши, импорт, европейский продукт, banana, banan, natural shuus, jimsnii shuus, shuus, sok, bunyo, sok bunio 330ml banana, vidan mn, vidan mongolia, polshoos, importiin, evropiin'
where id = '8eacbee4-a419-4be1-aaeb-dc654c082ab7';

-- Сок Bunio 330мл Гүзээлзгэнэ
update public.products set
  meta_title = 'Сок Bunio 330мл Гүзээлзгэнэ — натурал шүүс',
  meta_description = 'Сок Bunio 330мл Гүзээлзгэнэ. Нэмэлт чихэргүй натурал шүүс. Улаанбаатарт хүргэнэ.',
  search_keywords = 'гүзээлзгэн, натурал шүүс, жимсний шүүс, шүүс, bunio, сок bunio 330мл гүзээлзгэнэ, vidan, видан, видан онлайн дэлгүүр, польшоос, импортын бүтээгдэхүүн, европын бүтээгдэхүүн, клубника, клубничный, клубничное, натуральный сок, фруктовый сок, сок, бунио, vidan монголия, купить в улан-баторе, из польши, импорт, европейский продукт, guzeelzgene, guzeelzgen, guzeelzgenii, natural shuus, jimsnii shuus, shuus, sok, bunyo, sok bunio 330ml guzeelzgene, vidan mn, vidan mongolia, polshoos, importiin, evropiin'
where id = '76255fcf-b9e1-4e38-8507-c0a2d5c17b52';

-- Сок Bunio 330мл Лууван
update public.products set
  meta_title = 'Сок Bunio 330мл Лууван — натурал шүүс',
  meta_description = 'Сок Bunio 330мл Лууван. Нэмэлт чихэргүй натурал шүүс. Улаанбаатарт хүргэнэ.',
  search_keywords = 'лууван, натурал шүүс, жимсний шүүс, шүүс, bunio, сок bunio 330мл лууван, vidan, видан, видан онлайн дэлгүүр, польшоос, импортын бүтээгдэхүүн, европын бүтээгдэхүүн, морковь, морковный, морковное, натуральный сок, фруктовый сок, сок, бунио, vidan монголия, купить в улан-баторе, из польши, импорт, европейский продукт, luuvan, luuvang, luuwan, natural shuus, jimsnii shuus, shuus, sok, bunyo, sok bunio 330ml luuvan, vidan mn, vidan mongolia, polshoos, importiin, evropiin'
where id = '1db6929a-d073-420f-8d61-7421e9d6c3f2';

-- Сок Bunio 330мл Тоор
update public.products set
  meta_title = 'Сок Bunio 330мл Тоор — натурал шүүс',
  meta_description = 'Сок Bunio 330мл Тоор. Нэмэлт чихэргүй натурал шүүс. Улаанбаатарт хүргэнэ.',
  search_keywords = 'тоор, натурал шүүс, жимсний шүүс, шүүс, bunio, сок bunio 330мл тоор, vidan, видан, видан онлайн дэлгүүр, польшоос, импортын бүтээгдэхүүн, европын бүтээгдэхүүн, персик, персиковый, натуральный сок, фруктовый сок, сок, бунио, vidan монголия, купить в улан-баторе, из польши, импорт, европейский продукт, toor, tooriin, natural shuus, jimsnii shuus, shuus, sok, bunyo, sok bunio 330ml toor, vidan mn, vidan mongolia, polshoos, importiin, evropiin'
where id = '93e7126f-b424-4244-8738-10a52d7bf75c';

-- Сок Bunio 750мл Гүзээлзгэнэ
update public.products set
  meta_title = 'Сок Bunio 750мл Гүзээлзгэнэ — натурал шүүс',
  meta_description = 'Сок Bunio 750мл Гүзээлзгэнэ. Нэмэлт чихэргүй натурал шүүс. Улаанбаатарт хүргэнэ.',
  search_keywords = 'гүзээлзгэн, натурал шүүс, жимсний шүүс, шүүс, bunio, сок bunio 750мл гүзээлзгэнэ, vidan, видан, видан онлайн дэлгүүр, польшоос, импортын бүтээгдэхүүн, европын бүтээгдэхүүн, клубника, клубничный, клубничное, натуральный сок, фруктовый сок, сок, бунио, vidan монголия, купить в улан-баторе, из польши, импорт, европейский продукт, guzeelzgene, guzeelzgen, guzeelzgenii, natural shuus, jimsnii shuus, shuus, sok, bunyo, sok bunio 750ml guzeelzgene, vidan mn, vidan mongolia, polshoos, importiin, evropiin'
where id = '846230a6-5051-4749-83f9-34150dfc0eae';

-- Сок Bunio 750мл Лууван
update public.products set
  meta_title = 'Сок Bunio 750мл Лууван — натурал шүүс',
  meta_description = 'Сок Bunio 750мл Лууван. Нэмэлт чихэргүй натурал шүүс. Улаанбаатарт хүргэнэ.',
  search_keywords = 'лууван, натурал шүүс, жимсний шүүс, шүүс, bunio, сок bunio 750мл лууван, vidan, видан, видан онлайн дэлгүүр, польшоос, импортын бүтээгдэхүүн, европын бүтээгдэхүүн, морковь, морковный, морковное, натуральный сок, фруктовый сок, сок, бунио, vidan монголия, купить в улан-баторе, из польши, импорт, европейский продукт, luuvan, luuvang, luuwan, natural shuus, jimsnii shuus, shuus, sok, bunyo, sok bunio 750ml luuvan, vidan mn, vidan mongolia, polshoos, importiin, evropiin'
where id = '039a8968-f324-4f52-8812-3e0d7cbeca16';

-- Хад Жимсний чанамал 350г
update public.products set
  meta_title = 'Хад Жимсний чанамал 350г',
  meta_description = 'VIDAN хад Жимсний чанамал 350г. Польш улсаас оруулж ирсэн жимс жимсгэнээр үйлдвэрлэсэн чанамал. Улаанбаатарт хүргэнэ.',
  search_keywords = 'хад, чанамал, жимсний чанамал, жэм, vidan, хад жимсний чанамал 350г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, боярышник, боярышниковый, варенье, джем, конфитюр, фруктовое варенье, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, had, hadnii, khad, chanamal, chanamalt, jimsnii chanamal, jem, widan, had jimsnii chanamal 350g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = 'c577f54c-c217-4b79-be82-3a7beb37dc47';

-- Хадны компот 740г
update public.products set
  meta_title = 'Хадны компот 740г — жимсний компот',
  meta_description = 'VIDAN хадны компот 740г. Польш улсаас оруулж ирсэн жимс жимсгэнээр үйлдвэрлэсэн компот. Улаанбаатарт хүргэнэ.',
  search_keywords = 'хад, компот, жимсний компот, лаазалсан жимс, vidan, хадны компот 740г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, боярышник, боярышниковый, компоты, консервированные фрукты, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, had, hadnii, khad, kompot, compote, kompott, jimsnii kompot, widan, hadny kompot 740g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = 'd4f6f462-a6e3-4808-a70e-0e847b35f3b6';

-- Хүрэн манжин салат 550г
update public.products set
  meta_title = 'Хүрэн манжин салат 550г — даршилсан ногоо',
  meta_description = 'VIDAN хүрэн манжин салат 550г. Эх орны хөрсөнд ургуулсан ногоогоор Европ технологиор боловсруулсан. Улаанбаатарт хүргэнэ.',
  search_keywords = 'хүрэн манжин, салат, даршилсан ногоо, лаазалсан ногоо, нөөшилсөн ногоо, дарш, бэлэн салат, vidan, хүрэн манжин салат 550г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, свёкла, свекла, свекольный, свекольное, бурак, салаты, закуска, консервированные овощи, маринованные овощи, соленья, консервы, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, huren manjin, khuren manjin, huren manjing, manjin, svekla, salat, salad, darshilsan nogoo, laazalsan nogoo, nooshilson nogoo, belen salat, widan, huren manjin salat 550g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '31059f53-7733-428a-91f4-9c7429645cdb';

-- Хүрэн манжин Шүүс 270мл
update public.products set
  meta_title = 'Хүрэн манжин Шүүс 270мл — натурал шүүс',
  meta_description = 'VIDAN хүрэн манжин Шүүс 270мл. "Эрүүл зүрхний Үндэс" уриатай Эрүүл мэндийн ундаа. Улаанбаатарт хүргэнэ.',
  search_keywords = 'хүрэн манжин, шүүс, натурал шүүс, жимсний шүүс, vidan, хүрэн манжин шүүс 270мл, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, свёкла, свекла, свекольный, свекольное, бурак, сок, соки, натуральный сок, фруктовый сок, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, huren manjin, khuren manjin, huren manjing, manjin, svekla, shuus, sok, natural shuus, jimsnii shuus, widan, huren manjin shuus 270ml, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '92e8c491-4b4d-4a23-bc83-348695239c7b';

-- Хүрэн манжин, Алим нухаш 180г
update public.products set
  meta_title = 'Хүрэн манжин, Алим нухаш 180г — жимсний нухаш',
  meta_description = 'VIDAN хүрэн манжин, Алим нухаш 180г. Польш улсаас оруулж ирсэн алимаар болон эх орондоо тарьж ургуулсан хүрэн манжингаар үйлдвэрлэсэн нухаш. Улаанбаатарт хүрг',
  search_keywords = 'алим, хүрэн манжин, нухаш, жимсний нухаш, нэмэлтгүй нухаш, vidan, хүрэн манжин, алим нухаш 180г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, яблоко, яблочное, яблочный, яблоки, свёкла, свекла, свекольный, свекольное, бурак, пюре, фруктовое пюре, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, alim, alimnii, huren manjin, khuren manjin, huren manjing, manjin, svekla, nuhash, nukhash, jimsnii nuhash, widan, huren manjin alim nuhash 180g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '235c77f6-d7e4-4905-a935-7cd9663d804c';

-- Хүрэн манжин, Алим нухаш 720г
update public.products set
  meta_title = 'Хүрэн манжин, Алим нухаш 720г — жимсний нухаш',
  meta_description = 'VIDAN хүрэн манжин, Алим нухаш 720г. Польш улсаас оруулж ирсэн алимаар болон эх орондоо тарьж ургуулсан хүрэн манжингаар үйлдвэрлэсэн нухаш. Улаанбаатарт хүрг',
  search_keywords = 'алим, хүрэн манжин, нухаш, жимсний нухаш, нэмэлтгүй нухаш, vidan, хүрэн манжин, алим нухаш 720г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, яблоко, яблочное, яблочный, яблоки, свёкла, свекла, свекольный, свекольное, бурак, пюре, фруктовое пюре, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, alim, alimnii, huren manjin, khuren manjin, huren manjing, manjin, svekla, nuhash, nukhash, jimsnii nuhash, widan, huren manjin alim nuhash 720g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '8272f63d-20a5-4b2b-a8f1-33f60461ff4a';

-- Хүрэн манжин, Алим Смүүти 270мл
update public.products set
  meta_title = 'Хүрэн манжин, Алим Смүүти 270мл — натурал шүүс',
  meta_description = 'VIDAN хүрэн манжин, Алим Смүүти 270мл. "Эрүүл зүрхний Үндэс" уриатай Эрүүл мэндийн ундаа. Улаанбаатарт хүргэнэ.',
  search_keywords = 'алим, хүрэн манжин, смүүти, натурал шүүс, жимсний шүүс, шүүс, vidan, хүрэн манжин, алим смүүти 270мл, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, яблоко, яблочное, яблочный, яблоки, свёкла, свекла, свекольный, свекольное, бурак, смузи, натуральный сок, фруктовый сок, сок, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, alim, alimnii, huren manjin, khuren manjin, huren manjing, manjin, svekla, smuuti, smoothie, smuti, natural shuus, jimsnii shuus, shuus, sok, widan, huren manjin alim smuuti 270ml, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '9e76bfec-3038-461c-923a-4a94592412bb';

-- Чавганы компот 740г
update public.products set
  meta_title = 'Чавганы компот 740г — жимсний компот',
  meta_description = 'VIDAN чавганы компот 740г. Польш улсаас оруулж ирсэн жимс жимсгэнээр үйлдвэрлэсэн компот. Улаанбаатарт хүргэнэ.',
  search_keywords = 'чавга, компот, жимсний компот, лаазалсан жимс, vidan, чавганы компот 740г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, слива, сливовый, компоты, консервированные фрукты, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, chavga, chavganii, kompot, compote, kompott, jimsnii kompot, widan, chavgany kompot 740g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '12b542b4-b991-415f-8624-897408171134';

-- Чавганы чанамал 350г
update public.products set
  meta_title = 'Чавганы чанамал 350г — жимсний чанамал',
  meta_description = 'VIDAN чавганы чанамал 350г. Польш улсаас оруулж ирсэн жимс жимсгэнээр үйлдвэрлэсэн чанамал. Улаанбаатарт хүргэнэ.',
  search_keywords = 'чавга, чанамал, жимсний чанамал, жэм, vidan, чавганы чанамал 350г, видан, видан онлайн дэлгүүр, эх орны үйлдвэрлэл, монголын бүтээгдэхүүн, үндэсний үйлдвэрлэл, слива, сливовый, варенье, джем, конфитюр, фруктовое варенье, vidan монголия, купить в улан-баторе, монгольский продукт, произведено в монголии, chavga, chavganii, chanamal, chanamalt, jimsnii chanamal, jem, widan, chavgany chanamal 350g, vidan mn, vidan mongolia, eh ornii uildverlel, mongolyn buteegdehuun'
where id = '79dade02-31b1-4ab7-965f-43f22a369614';

commit;
