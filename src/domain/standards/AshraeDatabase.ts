// src/domain/standards/AshraeDatabase.ts

export interface LpdBaseline {
    type: string;
    base: number;
}

export const lpdBaselines: LpdBaseline[] =[
    { type: "Armazém/Estoque (Bulky/Medium)", base: 6.2 },
    { type: "Banheiros (Restrooms)", base: 10.5 },
    { type: "Biblioteca (Acervo/Stacks)", base: 18.4 },
    { type: "Biblioteca (Área de Leitura)", base: 10.0 },
    { type: "Corredor/Transição", base: 7.1 },
    { type: "Cozinha/Preparo de Alimentos", base: 10.7 },
    { type: "Escadas (Stairway)", base: 7.4 },
    { type: "Escritório Aberto (Open Plan)", base: 10.5 },
    { type: "Escritório Fechado (Enclosed)", base: 11.9 },
    { type: "Estacionamento (Garage Area)", base: 2.0 },
    { type: "Hospital (Exame/Tratamento)", base: 17.9 },
    { type: "Hospital (Quarto de Paciente)", base: 6.7 },
    { type: "Hospital (Sala de Cirurgia)", base: 20.3 },
    { type: "Indústria (Manufatura Detalhada)", base: 13.9 },
    { type: "Laboratório", base: 13.8 },
    { type: "Lobby / Recepção", base: 9.7 },
    { type: "Refeitório (Dining Area)", base: 7.0 },
    { type: "Sala de Aula/Treinamento", base: 13.3 },
    { type: "Sala de Reunião/Conferência", base: 13.2 },
    { type: "Varejo (Área de Vendas)", base: 18.1 },
    { type: "Varejo (Circulação de Mall)", base: 11.8 }
];