// src/domain/standards/Nbr8995Database.ts

export interface NbrNorm {
    cat: string;
    cat_en: string;
    room: string;
    room_en: string;
    lux: number;
    ugr: number | string;
    ra: number;
    plane: 'HP' | 'LP';
}

export const normsDatabase: NbrNorm[] =[
    { cat: "Áreas de Tráfego", cat_en: "Traffic Areas", room: "Áreas de circulação e corredores", room_en: "Circulation areas and corridors", lux: 100, ugr: 28, ra: 40, plane: 'LP' },
    { cat: "Áreas de Tráfego", cat_en: "Traffic Areas", room: "Escadas, escadas rolantes, esteiras", room_en: "Stairs, escalators, moving walkways", lux: 150, ugr: 25, ra: 40, plane: 'LP' },
    { cat: "Áreas de Tráfego", cat_en: "Traffic Areas", room: "Rampas de carregamento", room_en: "Loading ramps", lux: 150, ugr: 25, ra: 40, plane: 'LP' },
    
    { cat: "Edifícios (Geral)", cat_en: "Buildings (General)", room: "Cantinas", room_en: "Canteens", lux: 200, ugr: 22, ra: 80, plane: 'HP' },
    { cat: "Edifícios (Geral)", cat_en: "Buildings (General)", room: "Salas de descanso", room_en: "Rest rooms", lux: 100, ugr: 22, ra: 80, plane: 'HP' },
    { cat: "Edifícios (Geral)", cat_en: "Buildings (General)", room: "Salas de exercícios físicos", room_en: "Physical exercise rooms", lux: 300, ugr: 22, ra: 80, plane: 'LP' },
    { cat: "Edifícios (Geral)", cat_en: "Buildings (General)", room: "Vestiários, banheiros, toaletes", room_en: "Cloakrooms, washrooms, toilets", lux: 200, ugr: 25, ra: 80, plane: 'LP' },
    { cat: "Edifícios (Geral)", cat_en: "Buildings (General)", room: "Sala de primeiros socorros", room_en: "First aid room", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Edifícios (Geral)", cat_en: "Buildings (General)", room: "Salas para atendimento médico", room_en: "Medical attention rooms", lux: 500, ugr: 16, ra: 90, plane: 'HP' },
    { cat: "Edifícios (Geral)", cat_en: "Buildings (General)", room: "Salas de controle de instalações", room_en: "Plant control rooms", lux: 150, ugr: 25, ra: 60, plane: 'HP' },
    
    { cat: "Indústria", cat_en: "Industry", room: "Armazenamento (Depósitos)", room_en: "Storage (Warehouses)", lux: 100, ugr: 25, ra: 60, plane: 'LP' },
    { cat: "Indústria", cat_en: "Industry", room: "Expedição e embalagem", room_en: "Dispatch and packing", lux: 300, ugr: 25, ra: 60, plane: 'HP' },
    
    { cat: "Indústria (Alim.)", cat_en: "Industry (Food)", room: "Preparação de alimentos", room_en: "Food preparation", lux: 500, ugr: 22, ra: 80, plane: 'HP' },
    { cat: "Indústria (Alim.)", cat_en: "Industry (Food)", room: "Inspeção de cor", room_en: "Color inspection", lux: 1000, ugr: 19, ra: 90, plane: 'HP' },
    
    { cat: "Indústria (Metal)", cat_en: "Industry (Metal)", room: "Forjamento (livre)", room_en: "Open die forging", lux: 200, ugr: 25, ra: 60, plane: 'HP' },
    { cat: "Indústria (Metal)", cat_en: "Industry (Metal)", room: "Soldagem", room_en: "Welding", lux: 300, ugr: 22, ra: 60, plane: 'HP' },
    { cat: "Indústria (Metal)", cat_en: "Industry (Metal)", room: "Usinagem grosseira", room_en: "Rough machining", lux: 300, ugr: 22, ra: 60, plane: 'HP' },
    { cat: "Indústria (Metal)", cat_en: "Industry (Metal)", room: "Usinagem média", room_en: "Medium machining", lux: 500, ugr: 22, ra: 60, plane: 'HP' },
    { cat: "Indústria (Metal)", cat_en: "Industry (Metal)", room: "Usinagem fina", room_en: "Fine machining", lux: 750, ugr: 19, ra: 60, plane: 'HP' },
    
    { cat: "Indústria (Eletr.)", cat_en: "Industry (Electronics)", room: "Montagem de componentes (Geral)", room_en: "Component assembly (General)", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Indústria (Eletr.)", cat_en: "Industry (Electronics)", room: "Montagem fina / Inspeção", room_en: "Fine assembly / Inspection", lux: 1000, ugr: 16, ra: 80, plane: 'HP' },
    
    { cat: "Indústria (Textil)", cat_en: "Industry (Textile)", room: "Costura fina", room_en: "Fine sewing", lux: 750, ugr: 19, ra: 80, plane: 'HP' },
    
    { cat: "Indústria (Gráfica)", cat_en: "Industry (Printing)", room: "Impressão à máquina", room_en: "Machine printing", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Indústria (Gráfica)", cat_en: "Industry (Printing)", room: "Inspeção de cores (Controle)", room_en: "Color inspection (Control)", lux: 1500, ugr: 16, ra: 90, plane: 'HP' },
    
    { cat: "Indústria (Madeira)", cat_en: "Industry (Wood)", room: "Marcenaria (bancada)", room_en: "Joinery (bench)", lux: 300, ugr: 22, ra: 60, plane: 'HP' },
    { cat: "Indústria (Madeira)", cat_en: "Industry (Wood)", room: "Acabamento / Pintura", room_en: "Finishing / Painting", lux: 750, ugr: 22, ra: 80, plane: 'HP' },
    
    { cat: "Escritório", cat_en: "Office", room: "Arquivamento, cópia, circulação", room_en: "Filing, copying, circulation", lux: 300, ugr: 25, ra: 80, plane: 'LP' },
    { cat: "Escritório", cat_en: "Office", room: "Escrita, digitação, leitura", room_en: "Writing, typing, reading", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Escritório", cat_en: "Office", room: "Desenho técnico", room_en: "Technical drawing", lux: 750, ugr: 16, ra: 80, plane: 'HP' },
    { cat: "Escritório", cat_en: "Office", room: "Estações de trabalho CAD", room_en: "CAD workstations", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Escritório", cat_en: "Office", room: "Salas de conferência / reunião", room_en: "Conference / meeting rooms", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Escritório", cat_en: "Office", room: "Recepção / Balcão", room_en: "Reception / Desk", lux: 300, ugr: 22, ra: 80, plane: 'HP' },
    
    { cat: "Varejo", cat_en: "Retail", room: "Área de vendas (pequenas lojas)", room_en: "Sales area (small shops)", lux: 300, ugr: 22, ra: 80, plane: 'LP' },
    { cat: "Varejo", cat_en: "Retail", room: "Área de vendas (grandes lojas)", room_en: "Sales area (large shops)", lux: 500, ugr: 22, ra: 80, plane: 'LP' },
    { cat: "Varejo", cat_en: "Retail", room: "Caixa / Empacotamento", room_en: "Till / Wrapping", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Varejo", cat_en: "Retail", room: "Vitrine (Destaque)", room_en: "Window display (Highlight)", lux: 1000, ugr: "-", ra: 80, plane: 'HP' },
    
    { cat: "Locais Públicos", cat_en: "Public Places", room: "Saguões de entrada", room_en: "Entrance halls", lux: 100, ugr: 22, ra: 60, plane: 'LP' },
    { cat: "Locais Públicos", cat_en: "Public Places", room: "Bilheterias", room_en: "Ticket offices", lux: 300, ugr: 22, ra: 80, plane: 'HP' },
    { cat: "Locais Públicos", cat_en: "Public Places", room: "Restaurantes (Salão)", room_en: "Restaurants (Dining room)", lux: 200, ugr: 22, ra: 80, plane: 'HP' },
    { cat: "Locais Públicos", cat_en: "Public Places", room: "Restaurantes (Cozinha)", room_en: "Restaurants (Kitchen)", lux: 500, ugr: 22, ra: 80, plane: 'HP' },
    { cat: "Locais Públicos", cat_en: "Public Places", room: "Teatros / Cinemas (Foyer)", room_en: "Theaters / Cinemas (Foyer)", lux: 200, ugr: 22, ra: 80, plane: 'LP' },
    { cat: "Locais Públicos", cat_en: "Public Places", room: "Museus (Exposição geral)", room_en: "Museums (General exhibition)", lux: 300, ugr: 19, ra: 80, plane: 'LP' },
    { cat: "Locais Públicos", cat_en: "Public Places", room: "Bibliotecas (Estantes)", room_en: "Libraries (Bookshelves)", lux: 200, ugr: 19, ra: 80, plane: 'LP' },
    { cat: "Locais Públicos", cat_en: "Public Places", room: "Bibliotecas (Leitura)", room_en: "Libraries (Reading area)", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Locais Públicos", cat_en: "Public Places", room: "Estacionamento Coberto", room_en: "Covered parking", lux: 75, ugr: 25, ra: 40, plane: 'LP' },
    
    { cat: "Educação", cat_en: "Education", room: "Sala de aula", room_en: "Classrooms", lux: 300, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Educação", cat_en: "Education", room: "Sala de aula (Noturno/Adultos)", room_en: "Classrooms (Evening/Adults)", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Educação", cat_en: "Education", room: "Quadro negro (Vertical)", room_en: "Blackboard (Vertical)", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Educação", cat_en: "Education", room: "Auditório / Anfiteatro", room_en: "Auditorium / Lecture hall", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Educação", cat_en: "Education", room: "Laboratórios", room_en: "Laboratories", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Educação", cat_en: "Education", room: "Salas de arte / desenho", room_en: "Art / Drawing rooms", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Educação", cat_en: "Education", room: "Ginásios esportivos", room_en: "Sports halls", lux: 300, ugr: 22, ra: 80, plane: 'LP' },
    
    { cat: "Saúde", cat_en: "Healthcare", room: "Salas de espera", room_en: "Waiting rooms", lux: 200, ugr: 22, ra: 80, plane: 'LP' },
    { cat: "Saúde", cat_en: "Healthcare", room: "Corredores (dia)", room_en: "Corridors (day)", lux: 200, ugr: 22, ra: 80, plane: 'LP' },
    { cat: "Saúde", cat_en: "Healthcare", room: "Enfermaria (Geral)", room_en: "Wards (General)", lux: 100, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Saúde", cat_en: "Healthcare", room: "Enfermaria (Exame simples)", room_en: "Wards (Simple examination)", lux: 300, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Saúde", cat_en: "Healthcare", room: "Exame e tratamento (Geral)", room_en: "Examination and treatment (General)", lux: 1000, ugr: 19, ra: 90, plane: 'HP' },
    { cat: "Saúde", cat_en: "Healthcare", room: "Salas de cirurgia (Geral)", room_en: "Operating theaters (General)", lux: 1000, ugr: 19, ra: 90, plane: 'HP' },
    { cat: "Saúde", cat_en: "Healthcare", room: "Salas de cirurgia (Cavidade)", room_en: "Operating theaters (Cavity)", lux: 10000, ugr: "-", ra: 90, plane: 'HP' },
    { cat: "Saúde", cat_en: "Healthcare", room: "Dentista (Iluminação geral)", room_en: "Dentist (General lighting)", lux: 500, ugr: 19, ra: 90, plane: 'HP' },
    { cat: "Saúde", cat_en: "Healthcare", room: "Dentista (No paciente)", room_en: "Dentist (On patient)", lux: 1000, ugr: "-", ra: 90, plane: 'HP' },
    
    { cat: "Transporte", cat_en: "Transport", room: "Aeroportos (Embarque/Check-in)", room_en: "Airports (Departure/Check-in)", lux: 500, ugr: 19, ra: 80, plane: 'LP' },
    { cat: "Transporte", cat_en: "Transport", room: "Aeroportos (Saguões)", room_en: "Airports (Halls)", lux: 200, ugr: 22, ra: 80, plane: 'LP' },
    { cat: "Transporte", cat_en: "Transport", room: "Estações ferroviárias (Plataforma)", room_en: "Railway stations (Platform)", lux: 50, ugr: 28, ra: 40, plane: 'LP' }
];