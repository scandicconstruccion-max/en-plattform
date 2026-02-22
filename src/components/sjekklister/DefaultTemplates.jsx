// Forhåndsdefinerte maler for bygg og anlegg
export const DEFAULT_TEMPLATES = [
  {
    name: 'Kvalitetskontroll våtrom',
    description: 'Sjekkliste for kvalitets kontroll av bad, kjøkken og andre våtrom',
    category: 'kvalitet',
    version: 1,
    sections: [
      {
        title: 'Belegning og fuging',
        order: 0,
        items: [
          {
            order: 0,
            title: 'Flisene ligger plant og jevnt',
            description: 'Sjekk at alle fliser ligger helt plant uten ujevnheter',
            required: true,
            allow_image: true,
            allow_comment: true
          },
          {
            order: 1,
            title: 'Fugene er jevne og uten hull',
            description: 'Kontroller at alle fuger er korrekt fylt',
            required: true,
            allow_image: true,
            allow_comment: true
          },
          {
            order: 2,
            title: 'Farge og utseende på fugen',
            description: 'Sjekk at fugefarge stemmer',
            required: true,
            allow_image: true,
            allow_comment: true
          }
        ]
      },
      {
        title: 'Fuktighet og tetthet',
        order: 1,
        items: [
          {
            order: 3,
            title: 'Sjekk for fuktighet bak fliser',
            description: 'Bruk fuktmåler hvor relevant',
            required: false,
            allow_image: true,
            allow_comment: true
          },
          {
            order: 4,
            title: 'Kontroller drenering ved dusj',
            description: 'Sjekk at vann dreneres korrekt',
            required: true,
            allow_image: true,
            allow_comment: true
          }
        ]
      },
      {
        title: 'Armaturer og innfatning',
        order: 2,
        items: [
          {
            order: 5,
            title: 'Blandebatteri fungerer korrekt',
            required: true,
            allow_image: false,
            allow_comment: true
          },
          {
            order: 6,
            title: 'Håndklestang er sikker og festet',
            required: true,
            allow_image: true,
            allow_comment: true
          },
          {
            order: 7,
            title: 'Inspeksjonsluker for skjulte ledninger',
            description: 'Kontroller at det finnes inspeksjonsluker hvor nødvendig',
            required: false,
            allow_image: true,
            allow_comment: true
          }
        ]
      }
    ],
    custom_fields: [
      {
        id: 'wc_room_type',
        label: 'Romtype',
        field_type: 'text',
        required: false,
        order: 0
      },
      {
        id: 'wc_fuktmåler',
        label: 'Fuktmåler lesning (%)',
        field_type: 'number',
        required: false,
        order: 1
      }
    ]
  },
  {
    name: 'HMS inspeksjon på byggeplass',
    description: 'Daglig HMS kontroll på byggeplassen',
    category: 'hms',
    version: 1,
    sections: [
      {
        title: 'Personlig verneutstyr',
        order: 0,
        items: [
          {
            order: 0,
            title: 'Alle arbeidere bruker hjelm',
            required: true,
            allow_image: true,
            allow_comment: true
          },
          {
            order: 1,
            title: 'Sikkerhetsfottøy på alle',
            required: true,
            allow_image: true,
            allow_comment: true
          },
          {
            order: 2,
            title: 'Vernebrillerbrukes ved behov',
            required: true,
            allow_image: false,
            allow_comment: true
          }
        ]
      },
      {
        title: 'Byggeområde og sikkerhet',
        order: 1,
        items: [
          {
            order: 3,
            title: 'Byggeplassen er gjort ryddig',
            required: true,
            allow_image: true,
            allow_comment: true
          },
          {
            order: 4,
            title: 'Sikkerhetsgjerder er på plass',
            required: true,
            allow_image: true,
            allow_comment: true
          },
          {
            order: 5,
            title: 'Fall og stupefare er merket',
            required: true,
            allow_image: true,
            allow_comment: true
          }
        ]
      }
    ],
    custom_fields: [
      {
        id: 'hms_inspektør',
        label: 'Inspektør navn',
        field_type: 'text',
        required: true,
        order: 0
      },
      {
        id: 'hms_antall_arbeidere',
        label: 'Antall arbeidere på stedet',
        field_type: 'number',
        required: true,
        order: 1
      }
    ]
  },
  {
    name: 'Overtakelse av prosjekt',
    description: 'Sjekkliste for overtakelse av ferdig prosjekt fra entreprenør',
    category: 'overtakelse',
    version: 1,
    sections: [
      {
        title: 'Generell tilstand',
        order: 0,
        items: [
          {
            order: 0,
            title: 'Hele prosjektet er ferdigstilt',
            required: true,
            allow_image: true,
            allow_comment: true
          },
          {
            order: 1,
            title: 'Området er ryddig og rengjort',
            required: true,
            allow_image: true,
            allow_comment: true
          },
          {
            order: 2,
            title: 'All avfall er fjernet',
            required: true,
            allow_image: true,
            allow_comment: true
          }
        ]
      },
      {
        title: 'Funksjonalitet',
        order: 1,
        items: [
          {
            order: 3,
            title: 'Alle dører åpner og lukker korrekt',
            required: true,
            allow_image: true,
            allow_comment: true
          },
          {
            order: 4,
            title: 'Alle vinduer åpner og lukker',
            required: true,
            allow_image: true,
            allow_comment: true
          },
          {
            order: 5,
            title: 'Strøm og lys fungerer',
            required: true,
            allow_image: false,
            allow_comment: true
          }
        ]
      }
    ],
    custom_fields: [
      {
        id: 'overtakelse_dato',
        label: 'Overtakelsesdato',
        field_type: 'date',
        required: true,
        order: 0
      },
      {
        id: 'overtakelse_mottaker',
        label: 'Mottaker navn',
        field_type: 'text',
        required: true,
        order: 1
      }
    ]
  },
  {
    name: 'Tømrer- og innfestingskontroll',
    description: 'Kontroll av tømrer- og innfestingsarbeid',
    category: 'tømrer',
    version: 1,
    sections: [
      {
        title: 'Dørfester og karmer',
        order: 0,
        items: [
          {
            order: 0,
            title: 'Dørkarmer er plant og loddet',
            required: true,
            allow_image: true,
            allow_comment: true
          },
          {
            order: 1,
            title: 'Dørblader stenger tett',
            required: true,
            allow_image: false,
            allow_comment: true
          },
          {
            order: 2,
            title: 'Beslag og låser fungerer',
            required: true,
            allow_image: true,
            allow_comment: true
          }
        ]
      },
      {
        title: 'Vinduer',
        order: 1,
        items: [
          {
            order: 3,
            title: 'Vinduer åpner og lukker lett',
            required: true,
            allow_image: false,
            allow_comment: true
          },
          {
            order: 4,
            title: 'Tetting rundt vindu er OK',
            required: true,
            allow_image: true,
            allow_comment: true
          }
        ]
      }
    ],
    custom_fields: []
  }
];