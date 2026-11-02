# Ориентиры Aleksanterinkatu

Улица в игре — сжатая аркадная версия маршрута с запада на восток. Стороны и порядок заметных зданий сохранены, расстояния подстроены под трассу и перекрёстки. Фотографии использовались как справочный материал и не входят в игру; фасады построены процедурно.

| Ориентир | В игре | Основной источник |
| --- | --- | --- |
| Stockmann | Южная сторона; кирпич, бронзовые оконные пролёты, часы | [Finnish Architecture Navigator](https://www.finnisharchitecture.fi/projects/stockmann-department-store) |
| Дом Pohjola | Южная сторона; грубый камень, арка, медная угловая башня | [Finnish Architecture Navigator](https://www.finnisharchitecture.fi/projects/pohjola-insurance-company) |
| Lundqvist / Aleksi 13 | Северная сторона напротив Pohjola; красный кирпич и арочные окна | [Finnish Architecture Navigator](https://www.finnisharchitecture.fi/projects/lundqvist-commercial-building) |
| Главное здание университета | Северная сторона перед площадью; жёлтый фасад и портик | [Finnish Architecture Navigator](https://www.finnisharchitecture.fi/projects/helsinki-university) |
| Дом Седерхольма | Южная сторона у площади; низкий фасад и мансардная крыша | [Helsinki City Museum](https://www.helsinginkaupunginmuseo.fi/en/exhibitions/childrens-town/) |

`maps/aleksi-landmarks.js` резервирует фасады этих зданий, а обычная застройка заполняет промежутки. Улица выходит к стилизованной рыночной набережной с павильоном, лавками, фонтаном, терминалом и паромом. Трамвайные пути поворачивают вдоль берега; движение, столкновения и препятствие для струи используют общий маршрут в `runner/tram-route.js`.

Гранитная мостовая создаётся в `maps/aleksi-paving.js` и разделяет текстуры между участками. Детали рынка находятся в `maps/aleksi-market.js`, набережной — в `maps/aleksi-waterfront.js`. Дополнительные ориентиры для рыночной части: [Havis Amanda](https://www.hamhelsinki.fi/en/sculptures/havis-amanda-2/), [Market Square](https://www.hel.fi/en/urban-environment-and-traffic/urban-planning-and-construction/plans-and-building-projects/market-square) и [Old Market Hall](https://vanhakauppahalli.fi/en/story/).
