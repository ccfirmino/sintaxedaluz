// src/domain/standards/Nbr8995Database.ts

export interface NbrNorm {
    cat: string;
    catEn?: string;
    room: string;
    roomEn?: string;
    lux: number;
    ugr: number | string;
    ra: number;
    plane: 'HP' | 'LP';
}

export const normsDatabase: NbrNorm[] =[
    { cat: "Áreas de Tráfego", catEn: "Traffic Areas", room: "Áreas de circulação e corredores", roomEn: "Circulation areas and corridors", lux: 100, ugr: 28, ra: 40, plane: 'LP' },
    { cat: "Áreas de Tráfego", catEn: "Traffic Areas", room: "Escadas, escadas rolantes, esteiras", roomEn: "Stairs, escalators, moving walkways", lux: 150, ugr: 25, ra: 40, plane: 'LP' },
    { cat: "Áreas de Tráfego", catEn: "Traffic Areas", room: "Rampas de carregamento", roomEn: "Loading ramps", lux: 150, ugr: 25, ra: 40, plane: 'LP' },
    { cat: "Edifícios (Geral)", catEn: "Buildings (General)", room: "Cantinas", roomEn: "Canteens", lux: 200, ugr: 22, ra: 80, plane: 'HP' },
    { cat: "Edifícios (Geral)", catEn: "Buildings (General)", room: "Salas de descanso", roomEn: "Break rooms", lux: 100, ugr: 22, ra: 80, plane: 'HP' },
    { cat: "Edifícios (Geral)", catEn: "Buildings (General)", room: "Salas de exercícios físicos", roomEn: "Physical exercise rooms", lux: 300, ugr: 22, ra: 80, plane: 'LP' },
    { cat: "Edifícios (Geral)", catEn: "Buildings (General)", room: "Vestiários, banheiros, toaletes", roomEn: "Changing rooms, bathrooms, toilets", lux: 200, ugr: 25, ra: 80, plane: 'LP' },
    { cat: "Edifícios (Geral)", catEn: "Buildings (General)", room: "Sala de primeiros socorros", roomEn: "First aid room", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Edifícios (Geral)", catEn: "Buildings (General)", room: "Salas para atendimento médico", roomEn: "Medical attention rooms", lux: 500, ugr: 16, ra: 90, plane: 'HP' },
    { cat: "Edifícios (Geral)", catEn: "Buildings (General)", room: "Salas de controle de instalações", roomEn: "Plant control rooms", lux: 150, ugr: 25, ra: 60, plane: 'HP' },
    { cat: "Indústria", catEn: "Industry", room: "Armazenamento (Depósitos)", roomEn: "Storage (Depots)", lux: 100, ugr: 25, ra: 60, plane: 'LP' },
    { cat: "Indústria", catEn: "Industry", room: "Expedição e embalagem", roomEn: "Dispatch and packing", lux: 300, ugr: 25, ra: 60, plane: 'HP' },
    { cat: "Indústria (Alim.)", catEn: "Industry (Food)", room: "Preparação de alimentos", roomEn: "Food preparation", lux: 500, ugr: 22, ra: 80, plane: 'HP' },
    { cat: "Indústria (Alim.)", catEn: "Industry (Food)", room: "Inspeção de cor", roomEn: "Color inspection", lux: 1000, ugr: 19, ra: 90, plane: 'HP' },
    { cat: "Indústria (Metal)", catEn: "Industry (Metal)", room: "Forjamento (livre)", roomEn: "Forging (free)", lux: 200, ugr: 25, ra: 60, plane: 'HP' },
    { cat: "Indústria (Metal)", catEn: "Industry (Metal)", room: "Soldagem", roomEn: "Welding", lux: 300, ugr: 22, ra: 60, plane: 'HP' },
    { cat: "Indústria (Metal)", catEn: "Industry (Metal)", room: "Usinagem grosseira", roomEn: "Rough machining", lux: 300, ugr: 22, ra: 60, plane: 'HP' },
    { cat: "Indústria (Metal)", catEn: "Industry (Metal)", room: "Usinagem média", roomEn: "Medium machining", lux: 500, ugr: 22, ra: 60, plane: 'HP' },
    { cat: "Indústria (Metal)", catEn: "Industry (Metal)", room: "Usinagem fina", roomEn: "Fine machining", lux: 750, ugr: 19, ra: 60, plane: 'HP' },
    { cat: "Indústria (Eletr.)", catEn: "Industry (Electronics)", room: "Montagem de componentes (Geral)", roomEn: "Component assembly (General)", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Indústria (Eletr.)", catEn: "Industry (Electronics)", room: "Montagem fina / Inspeção", roomEn: "Fine assembly / Inspection", lux: 1000, ugr: 16, ra: 80, plane: 'HP' },
    { cat: "Indústria (Textil)", catEn: "Industry (Textile)", room: "Costura fina", roomEn: "Fine sewing", lux: 750, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Indústria (Gráfica)", catEn: "Industry (Printing)", room: "Impressão à máquina", roomEn: "Machine printing", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Indústria (Gráfica)", catEn: "Industry (Printing)", room: "Inspeção de cores (Controle)", roomEn: "Color inspection (Control)", lux: 1500, ugr: 16, ra: 90, plane: 'HP' },
    { cat: "Indústria (Madeira)", catEn: "Industry (Wood)", room: "Marcenaria (bancada)", roomEn: "Carpentry (bench)", lux: 300, ugr: 22, ra: 60, plane: 'HP' },
    { cat: "Indústria (Madeira)", catEn: "Industry (Wood)", room: "Acabamento / Pintura", roomEn: "Finishing / Painting", lux: 750, ugr: 22, ra: 80, plane: 'HP' },
    { cat: "Escritório", catEn: "Office", room: "Arquivamento, cópia, circulação", roomEn: "Filing, copying, circulation", lux: 300, ugr: 25, ra: 80, plane: 'LP' },
    { cat: "Escritório", catEn: "Office", room: "Escrita, digitação, leitura", roomEn: "Writing, typing, reading", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Escritório", catEn: "Office", room: "Desenho técnico", roomEn: "Technical drawing", lux: 750, ugr: 16, ra: 80, plane: 'HP' },
    { cat: "Escritório", catEn: "Office", room: "Estações de trabalho CAD", roomEn: "CAD workstations", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Escritório", catEn: "Office", room: "Salas de conferência / reunião", roomEn: "Conference / meeting rooms", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Escritório", catEn: "Office", room: "Recepção / Balcão", roomEn: "Reception / Desk", lux: 300, ugr: 22, ra: 80, plane: 'HP' },
    { cat: "Varejo", catEn: "Retail", room: "Área de vendas (pequenas lojas)", roomEn: "Sales area (small shops)", lux: 300, ugr: 22, ra: 80, plane: 'LP' },
    { cat: "Varejo", catEn: "Retail", room: "Área de vendas (grandes lojas)", roomEn: "Sales area (large shops)", lux: 500, ugr: 22, ra: 80, plane: 'LP' },
    { cat: "Varejo", catEn: "Retail", room: "Caixa / Empacotamento", roomEn: "Cashier / Packing", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Varejo", catEn: "Retail", room: "Vitrine (Destaque)", roomEn: "Shop window (Highlight)", lux: 1000, ugr: "-", ra: 80, plane: 'HP' },
    { cat: "Locais Públicos", catEn: "Public Places", room: "Saguões de entrada", roomEn: "Entrance halls", lux: 100, ugr: 22, ra: 60, plane: 'LP' },
    { cat: "Locais Públicos", catEn: "Public Places", room: "Bilheterias", roomEn: "Ticket offices", lux: 300, ugr: 22, ra: 80, plane: 'HP' },
    { cat: "Locais Públicos", catEn: "Public Places", room: "Restaurantes (Salão)", roomEn: "Restaurants (Dining hall)", lux: 200, ugr: 22, ra: 80, plane: 'HP' },
    { cat: "Locais Públicos", catEn: "Public Places", room: "Restaurantes (Cozinha)", roomEn: "Restaurants (Kitchen)", lux: 500, ugr: 22, ra: 80, plane: 'HP' },
    { cat: "Locais Públicos", catEn: "Public Places", room: "Teatros / Cinemas (Foyer)", roomEn: "Theatres / Cinemas (Foyer)", lux: 200, ugr: 22, ra: 80, plane: 'LP' },
    { cat: "Locais Públicos", catEn: "Public Places", room: "Museus (Exposição geral)", roomEn: "Museums (General exhibition)", lux: 300, ugr: 19, ra: 80, plane: 'LP' },
    { cat: "Locais Públicos", catEn: "Public Places", room: "Bibliotecas (Estantes)", roomEn: "Libraries (Bookshelves)", lux: 200, ugr: 19, ra: 80, plane: 'LP' },
    { cat: "Locais Públicos", catEn: "Public Places", room: "Bibliotecas (Leitura)", roomEn: "Libraries (Reading)", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Locais Públicos", catEn: "Public Places", room: "Estacionamento Coberto", roomEn: "Indoor Parking", lux: 75, ugr: 25, ra: 40, plane: 'LP' },
    { cat: "Educação", catEn: "Education", room: "Sala de aula", roomEn: "Classroom", lux: 300, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Educação", catEn: "Education", room: "Sala de aula (Noturno/Adultos)", roomEn: "Classroom (Evening/Adults)", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Educação", catEn: "Education", room: "Quadro negro (Vertical)", roomEn: "Blackboard (Vertical)", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Educação", catEn: "Education", room: "Auditório / Anfiteatro", roomEn: "Auditorium / Amphitheatre", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Educação", catEn: "Education", room: "Laboratórios", roomEn: "Laboratories", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Educação", catEn: "Education", room: "Salas de arte / desenho", roomEn: "Art / drawing rooms", lux: 500, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Educação", catEn: "Education", room: "Ginásios esportivos", roomEn: "Sports halls", lux: 300, ugr: 22, ra: 80, plane: 'LP' },
    { cat: "Saúde", catEn: "Healthcare", room: "Salas de espera", roomEn: "Waiting rooms", lux: 200, ugr: 22, ra: 80, plane: 'LP' },
    { cat: "Saúde", catEn: "Healthcare", room: "Corredores (dia)", roomEn: "Corridors (day)", lux: 200, ugr: 22, ra: 80, plane: 'LP' },
    { cat: "Saúde", catEn: "Healthcare", room: "Enfermaria (Geral)", roomEn: "Wards (General)", lux: 100, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Saúde", catEn: "Healthcare", room: "Enfermaria (Exame simples)", roomEn: "Wards (Simple examination)", lux: 300, ugr: 19, ra: 80, plane: 'HP' },
    { cat: "Saúde", catEn: "Healthcare", room: "Exame e tratamento (Geral)", roomEn: "Examination and treatment (General)", lux: 1000, ugr: 19, ra: 90, plane: 'HP' },
    { cat: "Saúde", catEn: "Healthcare", room: "Salas de cirurgia (Geral)", roomEn: "Operating theatres (General)", lux: 1000, ugr: 19, ra: 90, plane: 'HP' },
    { cat: "Saúde", catEn: "Healthcare", room: "Salas de cirurgia (Cavidade)", roomEn: "Operating theatres (Cavity)", lux: 10000, ugr: "-", ra: 90, plane: 'HP' },
    { cat: "Saúde", catEn: "Healthcare", room: "Dentista (Iluminação geral)", roomEn: "Dentist (General lighting)", lux: 500, ugr: 19, ra: 90, plane: 'HP' },
    { cat: "Saúde", catEn: "Healthcare", room: "Dentista (No paciente)", roomEn: "Dentist (At the patient)", lux: 1000, ugr: "-", ra: 90, plane: 'HP' },
    { cat: "Transporte", catEn: "Transportation", room: "Aeroportos (Embarque/Check-in)", roomEn: "Airports (Boarding/Check-in)", lux: 500, ugr: 19, ra: 80, plane: 'LP' },
    { cat: "Transporte", catEn: "Transportation", room: "Aeroportos (Saguões)", roomEn: "Airports (Halls)", lux: 200, ugr: 22, ra: 80, plane: 'LP' },
    { cat: "Transporte", catEn: "Transportation", room: "Estações ferroviárias (Plataforma)", roomEn: "Railway stations (Platform)", lux: 50, ugr: 28, ra: 40, plane: 'LP' }
];