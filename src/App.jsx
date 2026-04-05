import { useState, useEffect, useRef } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const TRAIN_TYPES = {
  A: { label:"A – Pull", color:"#4fc3f7", emoji:"🔵", muscles:["Costas","Bíceps","Antebraço","Escapular / Mobilidade"] },
  B: { label:"B – Push", color:"#f06292", emoji:"🔴", muscles:["Peito","Ombros","Tríceps"] },
  C: { label:"C – Legs Quad", color:"#81c784", emoji:"🟢", muscles:["Quadríceps","Panturrilha","Adutores / Abdutores"] },
  D: { label:"D – Upper", color:"#ffb74d", emoji:"🟡", muscles:["Peito","Costas","Ombros","Bíceps","Tríceps"] },
  E: { label:"E – Legs Post", color:"#ce93d8", emoji:"🟣", muscles:["Posterior de Coxa","Glúteos","Panturrilha","Core / Abdômen"] },
};

const EXERCISE_DB = {
  "Peito": [
    { name:"Supino reto com barra", desc:"Exercício multiarticular para peitoral médio/inferior. Permite alta carga.", alts:["Supino reto com halteres","Peck deck","Fly na máquina"] },
    { name:"Supino reto com halteres", desc:"Maior amplitude e trabalho estabilizador vs barra. Ótimo para hipertrofia.", alts:["Supino reto com barra","Crucifixo com halteres","Peck deck"] },
    { name:"Supino inclinado com barra", desc:"Ênfase no peitoral superior (clavicular). Essencial para volume superior.", alts:["Supino inclinado com halteres","Crucifixo inclinado com halteres","Crossover (cabo baixo)"] },
    { name:"Supino inclinado com halteres", desc:"Amplitude aumentada no peitoral superior. Foco em alongamento + contração.", alts:["Supino inclinado com barra","Crucifixo inclinado com halteres"] },
    { name:"Supino declinado com barra", desc:"Ênfase no peitoral inferior (esternal). Menos estresse no ombro.", alts:["Supino declinado com halteres","Crossover (cabo alto)"] },
    { name:"Supino declinado com halteres", desc:"Versão com halteres do declinado. Maior ROM e estabilização.", alts:["Supino declinado com barra","Crossover (cabo alto)"] },
    { name:"Crucifixo com halteres", desc:"Isolamento do peitoral com ênfase no alongamento. Preserva o ombro.", alts:["Peck deck","Crucifixo no cross (cabo alto)","Fly na máquina"] },
    { name:"Crucifixo inclinado com halteres", desc:"Isolamento do peitoral superior. Ótimo complemento ao supino inclinado.", alts:["Crossover (cabo baixo)","Peck deck"] },
    { name:"Crucifixo no cross (cabo alto)", desc:"Cabo alto para ênfase esternal/inferior. Tensão constante em todo ROM.", alts:["Crossover (cabo alto)","Crucifixo com halteres","Peck deck"] },
    { name:"Crucifixo no cross (cabo baixo)", desc:"Cabo baixo para ênfase superior. Tensão constante no alongamento.", alts:["Crossover (cabo baixo)","Crucifixo inclinado com halteres"] },
    { name:"Peck deck", desc:"Isolamento total do peitoral. Fácil de sentir a contração. Excelente finalizador.", alts:["Crucifixo com halteres","Fly na máquina","Crossover (cabo alto)"] },
    { name:"Pullover com halteres", desc:"Trabalha serrátil e peitoral em alongamento. Amplia a caixa torácica.", alts:["Pullover com corda na polia","Pullover na máquina"] },
    { name:"Crossover (cabo alto)", desc:"Cruzamento alto enfatizando peitoral inferior. Tensão no pico da contração.", alts:["Peck deck","Crucifixo no cross (cabo alto)"] },
    { name:"Crossover (cabo baixo)", desc:"Cruzamento baixo para peitoral superior. Excelente isolamento.", alts:["Crucifixo no cross (cabo baixo)","Crucifixo inclinado com halteres"] },
    { name:"Flexão de braço", desc:"Multiarticular usando peso corporal. Desenvolve peitoral + tríceps + core.", alts:["Supino reto com barra","Mergulho em paralelas (peitoral)"] },
    { name:"Fly na máquina", desc:"Substituto seguro do crucifixo. Sem risco de queda de peso.", alts:["Peck deck","Crucifixo com halteres"] },
    { name:"Mergulho em paralelas (peitoral)", desc:"Corpo inclinado à frente para ênfase no peitoral. Alta carga.", alts:["Supino declinado com barra","Crossover (cabo alto)"] },
  ],
  "Costas": [
    { name:"Puxada alta com barra reta", desc:"Adução escapular + puxada vertical. Latíssimo e romboides.", alts:["Barra fixa pronada","Puxada alta com pegada neutra","Puxada alta com barra triângulo"] },
    { name:"Puxada alta com barra triângulo", desc:"Pegada neutra reduz estresse no bíceps. Foco no latíssimo.", alts:["Puxada alta com barra reta","Puxada alta com pegada neutra"] },
    { name:"Puxada alta com pegada neutra", desc:"Equilibra latíssimo e bíceps com menos tensão articular.", alts:["Puxada alta com barra reta","Remada baixa com triângulo"] },
    { name:"Puxada alta com pegada supinada", desc:"Pegada supinada aumenta recrutamento do bíceps. Excelente para espessura.", alts:["Barra fixa supinada"] },
    { name:"Barra fixa pronada", desc:"Rei dos exercícios para costas. Carga total do corpo. Alta dificuldade.", alts:["Puxada alta com barra reta"] },
    { name:"Barra fixa supinada", desc:"Mais fácil que pronada. Maior ativação de bíceps.", alts:["Puxada alta com pegada supinada"] },
    { name:"Barra fixa neutra", desc:"Pegada neutra paralela. Menos tensão no punho e cotovelo.", alts:["Puxada alta com pegada neutra"] },
    { name:"Remada curvada com barra", desc:"Exercício fundamental para espessura das costas. Romboides e trapézio médio.", alts:["Remada cavalinho","Remada t-bar","Remada pendlay"] },
    { name:"Remada curvada com halteres", desc:"Maior ROM e assimetria corrigida. Excelente para costas superiores.", alts:["Remada serrote unilateral","Remada curvada com barra"] },
    { name:"Remada serrote unilateral", desc:"Unilateral com suporte. Permite carga alta e excelente ROM para latíssimo.", alts:["Remada curvada com halteres","Remada cavalinho"] },
    { name:"Remada cavalinho", desc:"Posição suportada permite foco total nas costas sem cansaço lombar.", alts:["Remada curvada com barra","Remada na máquina"] },
    { name:"Remada baixa com triângulo", desc:"Tração horizontal sentado. Ênfase em romboides e trapézio médio.", alts:["Remada baixa com barra","Remada na máquina","Remada cavalinho"] },
    { name:"Remada baixa com barra", desc:"Variação com barra na polia baixa. Maior ROM e sobrecarga progressiva.", alts:["Remada baixa com triângulo","Remada na máquina"] },
    { name:"Remada na máquina", desc:"Movimento guiado. Ótimo para iniciantes ou como finalizador de volume.", alts:["Remada baixa com triângulo","Remada cavalinho"] },
    { name:"Remada pendlay", desc:"Barra no chão entre cada rep. Alta tensão muscular pura.", alts:["Remada curvada com barra"] },
    { name:"Pullover com corda na polia", desc:"Ênfase no latíssimo em alongamento. Complementar à puxada alta.", alts:["Pullover com halteres","Pullover na máquina"] },
    { name:"Pullover com halteres", desc:"Clássico de Arnold para lats e serrátil. Expande a caixa torácica.", alts:["Pullover com corda na polia","Pullover na máquina"] },
    { name:"Pullover na máquina", desc:"Versão guiada do pullover. Mais segura e de fácil progressão.", alts:["Pullover com halteres","Pullover com corda na polia"] },
    { name:"Levantamento terra", desc:"Exercício máximo de força posterior. Trabalha toda cadeia posterior.", alts:["Levantamento terra sumô","Good morning"] },
    { name:"Levantamento terra sumô", desc:"Pernas abertas, menos estresse lombar, maior ênfase em glúteos/adutores.", alts:["Levantamento terra","Stiff com barra"] },
    { name:"Hiperextensão", desc:"Isolamento dos eretores da espinha e glúteos. Excelente para prevenção.", alts:["Good morning","Levantamento terra"] },
    { name:"Good morning", desc:"Fortalece eretores, ísquios e glúteos em alongamento.", alts:["Hiperextensão","Stiff com barra"] },
    { name:"Remada t-bar", desc:"Alta carga para espessura de costas. Pegada neutra ou pronada.", alts:["Remada curvada com barra","Remada cavalinho"] },
    { name:"Face pull", desc:"Trabalha rotadores externos, deltoide posterior e romboides. Saúde do ombro.", alts:["Posterior de ombro no cross","Posterior de ombro com halteres"] },
    { name:"Exercício escapular", desc:"Retração e depressão escapular. Fundamental para postura e saúde do ombro.", alts:["Pull apart com elástico","Band pull apart","Face pull (escapular)"] },
  ],
  "Ombros": [
    { name:"Desenvolvimento com barra", desc:"Multiarticular para deltoide anterior/medial. Alta carga possível.", alts:["Desenvolvimento com halteres","Desenvolvimento no aparelho","Arnold press"] },
    { name:"Desenvolvimento com halteres", desc:"Maior ROM e trabalho estabilizador. Corrige desequilíbrios.", alts:["Desenvolvimento com barra","Arnold press","Desenvolvimento unilateral"] },
    { name:"Desenvolvimento no aparelho", desc:"Guiado e seguro. Permite foco total sem equilíbrio.", alts:["Desenvolvimento com barra","Desenvolvimento com halteres"] },
    { name:"Desenvolvimento no smith", desc:"Movimento fixo, útil para overload progressivo com segurança.", alts:["Desenvolvimento com barra"] },
    { name:"Elevação lateral com halteres", desc:"Isolamento do deltoide medial. Fundamental para largura do ombro.", alts:["Elevação lateral na polia","Elevação lateral com drops"] },
    { name:"Elevação lateral na polia", desc:"Tensão constante durante todo ROM. Superior ao halter na posição baixa.", alts:["Elevação lateral com halteres","Elevação lateral com drops"] },
    { name:"Elevação frontal com barra", desc:"Deltoide anterior + parte superior do peitoral. Alta carga.", alts:["Elevação frontal com halteres","Elevação frontal na polia"] },
    { name:"Elevação frontal com halteres", desc:"Unilateral possível. Ativa mais estabilizadores que a barra.", alts:["Elevação frontal com barra","Elevação frontal na polia"] },
    { name:"Elevação frontal na polia", desc:"Tensão constante. Excelente complemento à elevação lateral.", alts:["Elevação frontal com halteres","Elevação lateral + frontal alternadas"] },
    { name:"Posterior de ombro no cross", desc:"Isolamento do deltoide posterior. Crucial para ombro balanceado.", alts:["Posterior de ombro com halteres","Face pull"] },
    { name:"Posterior de ombro com halteres", desc:"Deitado ou curvado. Ativa deltoide posterior e romboides.", alts:["Posterior de ombro no cross","Face pull"] },
    { name:"Arnold press", desc:"Rotação que ativa as 3 porções do deltoide. Criado por Arnold.", alts:["Desenvolvimento com halteres","Desenvolvimento com barra"] },
    { name:"Push press", desc:"Usa impulso das pernas. Alta carga para desenvolvimento.", alts:["Desenvolvimento com barra"] },
    { name:"Encolhimento com barra (trapézio)", desc:"Isolamento do trapézio superior. Complementa o desenvolvimento do ombro.", alts:["Encolhimento com halteres"] },
    { name:"Encolhimento com halteres", desc:"Maior ROM que a barra. Trabalha cada lado independentemente.", alts:["Encolhimento com barra (trapézio)"] },
    { name:"Elevação lateral + frontal alternadas", desc:"Combinação de lateral e frontal. Volume alto em menos tempo.", alts:["Elevação lateral com halteres","Elevação frontal com halteres"] },
    { name:"Elevação lateral com drops", desc:"Técnica de intensidade: várias cargas consecutivas. Máximo volume.", alts:["Elevação lateral com halteres","Elevação lateral na polia"] },
    { name:"Desenvolvimento unilateral", desc:"Corrige desequilíbrios entre lados. Ativa mais core.", alts:["Desenvolvimento com halteres"] },
  ],
  "Bíceps": [
    { name:"Rosca direta com barra", desc:"Fundamental para espessura do bíceps. Permite alta carga.", alts:["Rosca direta com halteres","Rosca Scott com barra W","Rosca na polia (cabo baixo)"] },
    { name:"Rosca direta com halteres", desc:"Supinação dinâmica ativa mais fibras do bíceps que a barra.", alts:["Rosca direta com barra","Rosca alternada com halteres"] },
    { name:"Rosca alternada com halteres", desc:"Alternando permite maior concentração e range of motion por lado.", alts:["Rosca direta com halteres","Rosca concentrada"] },
    { name:"Rosca Scott com barra W", desc:"Cotovelo fixo no banco Scott. Máximo isolamento sem trapaça.", alts:["Rosca Scott com halteres","Rosca concentrada","Rosca na polia (cabo baixo)"] },
    { name:"Rosca Scott com halteres", desc:"Maior ROM que a barra W. Excelente para pico do bíceps.", alts:["Rosca Scott com barra W","Rosca concentrada"] },
    { name:"Rosca concentrada", desc:"Máximo isolamento do bíceps. Esmagamento na contração.", alts:["Rosca Scott com halteres","Rosca cable curl unilateral"] },
    { name:"Rosca 45° com halteres", desc:"Banco inclinado mantém tensão no alongamento. Ativa cabeça longa do bíceps.", alts:["Rosca inclinada","Rosca na polia (cabo baixo)"] },
    { name:"Rosca inclinada", desc:"Ênfase na cabeça longa. Excelente para comprimento do bíceps.", alts:["Rosca 45° com halteres"] },
    { name:"Rosca martelo", desc:"Pegada neutra. Ativa braquial e braquiorradial além do bíceps.", alts:["Rosca inversa (barra)","Rosca zottman"] },
    { name:"Rosca inversa (barra)", desc:"Pegada pronada. Trabalha braquiorradial e antebraço.", alts:["Rosca martelo","Flexão de punho (polia alta)"] },
    { name:"Rosca na polia (cabo baixo)", desc:"Tensão constante em todo ROM. Superior ao halter na fase baixa.", alts:["Rosca direta com barra","Rosca cable curl unilateral"] },
    { name:"Rosca na corda", desc:"Pegada neutra na polia. Trabalha bíceps e braquial.", alts:["Rosca direta na corda com drops","Rosca na polia (cabo baixo)"] },
    { name:"Rosca direta na corda com drops", desc:"Alta intensidade com drops. Máximo estímulo metabólico para bíceps.", alts:["Rosca direta com halteres","Rosca na corda"] },
    { name:"Rosca zottman", desc:"Sobe supinado, desce pronado. Trabalha bíceps e braquiorradial.", alts:["Rosca martelo","Rosca alternada com halteres"] },
    { name:"Rosca cable curl unilateral", desc:"Unilateral na polia. Tensão constante + foco em cada lado.", alts:["Rosca concentrada","Rosca Scott com halteres"] },
  ],
  "Tríceps": [
    { name:"Tríceps testa com barra", desc:"Peso sobre a testa com barra. Alta carga para cabeça longa do tríceps.", alts:["Skull crusher","Tríceps testa com halteres","Tríceps francês com barra"] },
    { name:"Tríceps testa com halteres", desc:"Maior ROM que a barra. Trabalha cada lado independentemente.", alts:["Tríceps testa com barra","Skull crusher"] },
    { name:"Tríceps francês com barra", desc:"Overhead. Ênfase na cabeça longa em alongamento.", alts:["Tríceps francês com halteres","Tríceps francês no cross com corda"] },
    { name:"Tríceps francês com halteres", desc:"Maior ROM e correção de assimetrias.", alts:["Tríceps francês com barra","Overhead tricep extension"] },
    { name:"Tríceps francês no cross com corda", desc:"Cabo mantém tensão no ponto de máximo alongamento.", alts:["Tríceps francês com barra","Overhead tricep extension"] },
    { name:"Tríceps na polia com corda", desc:"Extensão de cotovelo com corda. Finaliza com abertura para máxima contração.", alts:["Tríceps na polia com barra reta","Tríceps na polia unilateral"] },
    { name:"Tríceps na polia com barra reta", desc:"Clássico isolamento. Maior carga que a corda.", alts:["Tríceps na polia com corda","Tríceps na polia unilateral"] },
    { name:"Tríceps na polia unilateral", desc:"Corrige desequilíbrios entre lados. Melhor isolamento.", alts:["Tríceps testa na polia unilateral","Tríceps na polia com corda"] },
    { name:"Tríceps testa na polia unilateral", desc:"Overhead unilateral na polia. Máximo alongamento da cabeça longa.", alts:["Tríceps na polia unilateral","Tríceps francês no cross com corda"] },
    { name:"Mergulho em paralelas (tríceps)", desc:"Corpo ereto para foco no tríceps. Exercício fundamental de alta carga.", alts:["Supino fechado","Tríceps no banco"] },
    { name:"Tríceps coice com halteres", desc:"Extensão de cotovelo livre. Boa para finalização com foco em contração.", alts:["Tríceps coice na polia","Tríceps na polia com corda"] },
    { name:"Tríceps coice na polia", desc:"Tensão constante no coice. Superior ao halter no ponto de contração.", alts:["Tríceps coice com halteres"] },
    { name:"Supino fechado", desc:"Supino com pegada estreita. Multiarticular para tríceps. Alta carga.", alts:["Mergulho em paralelas (tríceps)","Tríceps testa com barra"] },
    { name:"Skull crusher", desc:"Abaixando até a testa. Clássico bodybuilding.", alts:["Tríceps testa com barra","Tríceps francês com barra"] },
    { name:"Overhead tricep extension", desc:"Qualquer extensão acima da cabeça. Máximo alongamento da cabeça longa.", alts:["Tríceps francês com barra","Tríceps francês no cross com corda"] },
    { name:"Tríceps no banco", desc:"Corpo suspenso entre bancos. Bodyweight para tríceps. Versátil.", alts:["Mergulho em paralelas (tríceps)"] },
  ],
  "Antebraço": [
    { name:"Flexão de punho (barra)", desc:"Flexores do antebraço. Importante para força de preensão.", alts:["Flexão de punho (halteres)","Flexão de punho (polia alta)"] },
    { name:"Flexão de punho (halteres)", desc:"Versão com halteres. Permite maior ROM por lado.", alts:["Flexão de punho (barra)","Flexão de punho (polia alta)"] },
    { name:"Flexão de punho (polia alta)", desc:"Tensão constante nos flexores do antebraço.", alts:["Flexão de punho (barra)"] },
    { name:"Extensão de punho", desc:"Extensores do antebraço. Balanceia o trabalho dos flexores.", alts:["Flexão de punho (barra)"] },
    { name:"Rosca inversa (barra)", desc:"Braquiorradial e extensores do antebraço. Duplo benefício.", alts:["Rosca martelo","Extensão de punho"] },
    { name:"Rosca martelo", desc:"Braquial e braquiorradial. Aumenta espessura do braço.", alts:["Rosca inversa (barra)","Rosca zottman"] },
    { name:"Farmer's walk", desc:"Caminhada carregando peso. Máxima força de preensão e core.", alts:["Flexão de punho (barra)"] },
    { name:"Pronação e supinação", desc:"Mobilidade e força rotacional do antebraço. Prevenção de lesões.", alts:["Rosca martelo"] },
  ],
  "Quadríceps": [
    { name:"Agachamento livre", desc:"Rei dos exercícios. Multiarticular para toda perna. Alta carga funcional.", alts:["Agachamento no smith","Leg press 45°","Hack squat"] },
    { name:"Agachamento no smith", desc:"Movimento guiado. Seguro e útil para foco unilateral ou variações.", alts:["Agachamento livre","Hack squat"] },
    { name:"Agachamento goblet", desc:"Halter ou kettlebell na frente. Ótimo para técnica e mobilidade.", alts:["Agachamento livre","Agachamento no smith"] },
    { name:"Agachamento búlgaro com halteres", desc:"Unilateral com pé traseiro elevado. Altíssima ativação de quad e glúteo.", alts:["Agachamento búlgaro com barra","Avanço com halteres","Afundo"] },
    { name:"Agachamento búlgaro com barra", desc:"Versão com barra para maior carga. Excelente para hipertrofia unilateral.", alts:["Agachamento búlgaro com halteres","Avanço com barra"] },
    { name:"Leg press 45°", desc:"Alta carga sem estresse axial. Ótimo para volume de quadríceps.", alts:["Leg press horizontal","Hack squat","Extensora"] },
    { name:"Leg press horizontal", desc:"Menor estresse no joelho que o 45°.", alts:["Leg press 45°","Extensora"] },
    { name:"Extensora", desc:"Isolamento puro do quadríceps. Excelente finalização ou pré-exaustão.", alts:["Leg press 45°","Hack squat"] },
    { name:"Hack squat", desc:"Máquina de agachamento guiado. Alta carga, menor risco lombar.", alts:["Agachamento livre","Leg press 45°"] },
    { name:"Avanço com halteres", desc:"Unilateral para quad e glúteo. Excelente para equilíbrio e hipertrofia.", alts:["Avanço com barra","Agachamento búlgaro com halteres","Step up com halteres"] },
    { name:"Avanço com barra", desc:"Alta carga no avanço. Semelhante ao búlgaro mas sem elevação do pé.", alts:["Avanço com halteres","Agachamento búlgaro com barra"] },
    { name:"Step up com halteres", desc:"Subida no banco. Unilateral funcional para quad e glúteo.", alts:["Avanço com halteres","Agachamento búlgaro com halteres"] },
    { name:"Pistol squat", desc:"Agachamento unilateral no peso corporal. Exige mobilidade e força.", alts:["Agachamento búlgaro com halteres"] },
    { name:"Agachamento sumo", desc:"Pernas abertas, ênfase em adutores e glúteos além do quad.", alts:["Agachamento livre","Leg press 45°"] },
    { name:"Afundo", desc:"Passada longa para frente. Unilateral com ótimo ROM.", alts:["Avanço com halteres","Agachamento búlgaro com halteres"] },
  ],
  "Posterior de Coxa": [
    { name:"Mesa flexora", desc:"Isolamento dos ísquiotibiais. Fundamental para equilíbrio quad/posterior.", alts:["Cadeira flexora","Leg curl deitado","Leg curl em pé"] },
    { name:"Cadeira flexora", desc:"Variação sentado. Maior ativação da cabeça curta.", alts:["Mesa flexora","Leg curl em pé"] },
    { name:"Stiff com barra", desc:"Alta tensão nos ísquios. Levantamento terra romeno com barra.", alts:["Stiff com halteres","Levantamento terra romeno","Good morning"] },
    { name:"Stiff com halteres", desc:"Maior ROM que a barra. Excelente para alongamento dos ísquios.", alts:["Stiff com barra","Deadlift romeno unilateral"] },
    { name:"Levantamento terra romeno", desc:"RDL: tensão excêntrica nos ísquios. Fundamental para posterior.", alts:["Stiff com barra","Deadlift romeno unilateral"] },
    { name:"Glute ham raise", desc:"Ísquios em alta tensão concêntrica e excêntrica. Exercício avançado.", alts:["Mesa flexora","Nordic curl"] },
    { name:"Good morning", desc:"Flexão de quadril com barra. Ativa eretores e ísquios fortemente.", alts:["Stiff com barra","Hiperextensão"] },
    { name:"Leg curl deitado", desc:"Idêntico à mesa flexora. Nome alternativo.", alts:["Mesa flexora","Cadeira flexora"] },
    { name:"Leg curl em pé", desc:"Unilateral. Maior isolamento e ROM por perna.", alts:["Mesa flexora","Leg curl deitado"] },
    { name:"Leg curl unilateral", desc:"Corrige desequilíbrios entre pernas.", alts:["Leg curl em pé","Mesa flexora"] },
    { name:"Nordic curl", desc:"Exercício excêntrico máximo para ísquios. Alta prevenção de lesões.", alts:["Mesa flexora","Glute ham raise"] },
    { name:"Deadlift romeno unilateral", desc:"RDL unilateral. Equilíbrio + força de ísquios.", alts:["Stiff com halteres","Leg curl em pé"] },
  ],
  "Glúteos": [
    { name:"Glute bridge", desc:"Elevação de quadril no chão. Ativa glúteo máximo sem compressão lombar.", alts:["Hip thrust com barra","Hip thrust na máquina"] },
    { name:"Hip thrust com barra", desc:"Rei dos exercícios para glúteo. Carga máxima em encurtamento.", alts:["Glute bridge","Hip thrust na máquina"] },
    { name:"Hip thrust na máquina", desc:"Versão guiada e segura do hip thrust.", alts:["Hip thrust com barra","Glute bridge"] },
    { name:"Elevação de quadril unilateral", desc:"Unilateral para corrigir desequilíbrios entre glúteos.", alts:["Glute bridge","Hip thrust com barra"] },
    { name:"Abdutora na máquina", desc:"Isolamento do glúteo médio. Essencial para estabilidade do quadril.", alts:["Abdução de quadril","Monster walk com elástico"] },
    { name:"Kickback na polia", desc:"Extensão de quadril na polia. Isola o glúteo máximo.", alts:["Donkey kick","Hip thrust com barra"] },
    { name:"Donkey kick", desc:"Extensão de quadril no chão. Clássico para glúteo máximo.", alts:["Kickback na polia"] },
    { name:"Avanço reverso", desc:"Passada para trás. Menos tensão no joelho, mais foco no glúteo.", alts:["Avanço com halteres","Agachamento búlgaro com halteres"] },
    { name:"Monster walk com elástico", desc:"Caminhada lateral com elástico. Ativa glúteo médio e mínimo.", alts:["Abdutora na máquina"] },
  ],
  "Panturrilha": [
    { name:"Panturrilha em pé (máquina)", desc:"Gastrocnêmio em máxima carga. Joelho estendido = maior ativação.", alts:["Gêmeos em pé","Panturrilha com halteres","Panturrilha unilateral"] },
    { name:"Panturrilha sentado (máquina)", desc:"Sóleo em foco com joelho fletido. Complementa a versão em pé.", alts:["Gêmeos sentado"] },
    { name:"Panturrilha no leg press", desc:"Alta carga no leg press. Excelente ROM e sobrecarga progressiva.", alts:["Panturrilha em pé (máquina)"] },
    { name:"Panturrilha com halteres", desc:"Unilateral ou bilateral. Mais ROM que a máquina.", alts:["Panturrilha em pé (máquina)","Panturrilha unilateral"] },
    { name:"Gêmeos em pé", desc:"Nome alternativo para panturrilha em pé. Gastrocnêmio.", alts:["Panturrilha em pé (máquina)"] },
    { name:"Gêmeos sentado", desc:"Nome alternativo para panturrilha sentado. Sóleo.", alts:["Panturrilha sentado (máquina)"] },
    { name:"Panturrilha unilateral", desc:"Unilateral em pé ou máquina. Corrige desequilíbrios.", alts:["Panturrilha em pé (máquina)","Panturrilha com halteres"] },
    { name:"Salto de corda", desc:"Alta frequência de panturrilha. Cardio + força de panturrilha.", alts:["Panturrilha em pé (máquina)"] },
  ],
  "Core / Abdômen": [
    { name:"Abdominal supra", desc:"Crunch básico. Ativa reto abdominal superior.", alts:["Crunch","Abdominal no cabo"] },
    { name:"Abdominal infra", desc:"Levantamento de pernas. Ativa reto abdominal inferior.", alts:["Leg raise","Hollow hold"] },
    { name:"Crunch", desc:"Flexão do tronco. Base do treinamento abdominal.", alts:["Abdominal supra","Abdominal no cabo"] },
    { name:"Crunch oblíquo", desc:"Rotação + flexão. Ativa oblíquos além do reto.", alts:["Russian twist","Prancha lateral"] },
    { name:"Prancha", desc:"Isometria do core. Trabalha todos os estabilizadores profundos.", alts:["Dead bug","Hollow hold"] },
    { name:"Prancha lateral", desc:"Ativa oblíquos e quadrado lombar em isometria.", alts:["Crunch oblíquo","Russian twist"] },
    { name:"Russian twist", desc:"Rotação do tronco. Oblíquos + reto em conjunto.", alts:["Crunch oblíquo","Prancha lateral"] },
    { name:"Leg raise", desc:"Elevação de pernas. Alta tensão no reto inferior.", alts:["Abdominal infra","Dragon flag"] },
    { name:"Hollow hold", desc:"Posição isométrica avançada. Core completo e lombar protegida.", alts:["Prancha","Dead bug"] },
    { name:"Ab wheel", desc:"Extensão abdominal com roda. Exercício avançado de core.", alts:["Dragon flag","Hollow hold"] },
    { name:"Abdominal no cabo", desc:"Crunch na polia. Permite sobrecarga progressiva no abdômen.", alts:["Crunch","Abdominal supra"] },
    { name:"Dragon flag", desc:"Exercício avançado de Bruce Lee. Core total em isometria dinâmica.", alts:["Ab wheel","Leg raise"] },
    { name:"Dead bug", desc:"Anti-rotação no chão. Ótimo para ativação do core profundo.", alts:["Bird dog","Prancha"] },
    { name:"Bird dog", desc:"Extensão alternada de braço e perna. Core + estabilidade lombar.", alts:["Dead bug","Prancha"] },
  ],
  "Adutores / Abdutores": [
    { name:"Adutora na máquina", desc:"Isolamento dos adutores. Importante para equilíbrio muscular do quadril.", alts:["Adução de quadril com cabo","Agachamento sumo"] },
    { name:"Abdutora na máquina", desc:"Isolamento do glúteo médio. Estabilidade do quadril e joelho.", alts:["Abdução de quadril com cabo","Monster walk com elástico"] },
    { name:"Adução de quadril com cabo", desc:"Adução funcional com polia. Maior ROM que a máquina.", alts:["Adutora na máquina"] },
    { name:"Abdução de quadril com cabo", desc:"Abdução com polia. Tensão constante no glúteo médio.", alts:["Abdutora na máquina","Monster walk com elástico"] },
    { name:"Monster walk com elástico", desc:"Caminhada lateral com elástico. Glúteo médio + adutores.", alts:["Abdutora na máquina"] },
  ],
  "Escapular / Mobilidade": [
    { name:"Exercício escapular", desc:"Retração e depressão da escápula. Fundamental para postura saudável.", alts:["Pull apart com elástico","Band pull apart","Face pull (escapular)"] },
    { name:"Pull apart com elástico", desc:"Abertura horizontal com elástico. Ativa romboides e deltoide posterior.", alts:["Band pull apart","Exercício escapular"] },
    { name:"Dislocate com bastão", desc:"Rotação de ombro com bastão. Mobilidade glenoumeral.", alts:["Rotação externa","Rotação de manguito rotador"] },
    { name:"Rotação externa", desc:"Manguito rotador. Previne lesões no supraespinhal.", alts:["Rotação de manguito rotador","Dislocate com bastão"] },
    { name:"Band pull apart", desc:"Elástico na frente, abre até as costas. Essencial para saúde do ombro.", alts:["Pull apart com elástico","Face pull (escapular)"] },
    { name:"Rotação de manguito rotador", desc:"Rotação interna e externa. Saúde completa do manguito.", alts:["Rotação externa"] },
    { name:"Face pull (escapular)", desc:"Retração + rotação. Um dos melhores exercícios de saúde do ombro.", alts:["Band pull apart","Exercício escapular"] },
    { name:"Serrátil anterior na polia", desc:"Protração escapular. Ativa serrátil anterior. Importante para postura.", alts:["Exercício escapular"] },
  ],
};

const ALL_EXERCISES = Object.entries(EXERCISE_DB).flatMap(([cat,exs])=>exs.map(e=>({...e,category:cat})));
const findExercise = name => ALL_EXERCISES.find(e=>e.name===name)||{name,desc:"",alts:[],category:""};

const PERIODIZATION_TIPS = {
  A:[
    {phase:"Semanas 1-4 · Acumulação",tip:"Foque em volume total. Priorize puxadas verticais (puxada/barra fixa) e remadas horizontais pesadas. Use 3-4 séries de 10-12 reps. Inclua um exercício de bíceps com ênfase no alongamento (rosca 45° inclinada)."},
    {phase:"Semanas 5-8 · Intensificação",tip:"Reduza o número de exercícios, aumente a carga. Barra fixa com carga extra, remada pendlay pesada. 4×6-8 reps. Intensificadores: rest-pause na puxada, drop set na rosca."},
    {phase:"Semanas 9-12 · Realização",tip:"Volume máximo de séries. Inclua cluster sets na barra fixa, myo-reps na rosca. Semana 12: deload com 60% do volume total mantendo intensidade."},
  ],
  B:[
    {phase:"Semanas 1-4 · Acumulação",tip:"Volume em peitoral superior (inclinado) e desenvolvimento. 3-4×10-12. Priorize tríceps em overhead (cabeça longa) e um exercício de extensão de cotovelo."},
    {phase:"Semanas 5-8 · Intensificação",tip:"Supino pesado como exercício principal 4-5×5-8. Mantenha lateral com drops e overhead para tríceps. Reduza total de exercícios por treino."},
    {phase:"Semanas 9-12 · Realização",tip:"Maior volume em ombro (deltoide medial é frequentemente o ponto fraco). Giant sets de ombro: lateral + frontal + posterior consecutivos. Tríceps finalizador com drop set."},
  ],
  C:[
    {phase:"Semanas 1-4 · Acumulação",tip:"Base em agachamento livre + leg press. 3×10-12 em extensora como finalizador. Panturrilha: 4-5 séries com ênfase no sóleo (sentado)."},
    {phase:"Semanas 5-8 · Intensificação",tip:"Agachamento pesado 4×6-8 + búlgaro pesado 3×8. Use extensora como pré-exaustão antes do agachamento. Panturrilha: cargas máximas em pé."},
    {phase:"Semanas 9-12 · Realização",tip:"Volume máximo: 5-6 séries de leg press com diferentes posições de pé. Giant set de panturrilha: sentado + em pé + no leg press sem descanso entre exercícios."},
  ],
  D:[
    {phase:"Semanas 1-4 · Acumulação",tip:"Treino Upper equilibrado: 2 exercícios puxada/costas, 2 empurrar, 1-2 braços, 1-2 ombros. Volume moderado 3×10-12 cada grupamento."},
    {phase:"Semanas 5-8 · Intensificação",tip:"Selecione movimentos mais pesados e reduza variedade. Remada pesada + supino inclinado + desenvolvimento + rosca + tríceps overhead. 4×6-8."},
    {phase:"Semanas 9-12 · Realização",tip:"Foque no que menos progrediu nas semanas anteriores. Adicione técnica de intensidade (rest-pause, drop set) nos exercícios principais do treino D."},
  ],
  E:[
    {phase:"Semanas 1-4 · Acumulação",tip:"Volume em mesa flexora + stiff. Inclua hip thrust para glúteos. 3×10-12 em cada. Panturrilha em pé 4-5 séries. Core: 2-3 exercícios ao final."},
    {phase:"Semanas 5-8 · Intensificação",tip:"Stiff pesado como principal 4×6-8. Mesa flexora com isometria. Hip thrust com carga máxima. Abdutora pesada para glúteo médio."},
    {phase:"Semanas 9-12 · Realização",tip:"Volume máximo de ísquios. Superset: mesa flexora + stiff sem descanso entre exercícios. Nordic curl excêntrico para prevenção e pico de hipertrofia."},
  ],
};

const MUSCLE_GROUPS = [
  {key:"Peito",label:"Peito",icon:"💪"},{key:"Costas",label:"Costas",icon:"🔙"},
  {key:"Ombros",label:"Ombros",icon:"🔝"},{key:"Bíceps",label:"Bíceps",icon:"💙"},
  {key:"Tríceps",label:"Tríceps",icon:"❤️"},{key:"Quadríceps",label:"Quadríceps",icon:"🦵"},
  {key:"Posterior de Coxa",label:"Posterior",icon:"🦶"},{key:"Glúteos",label:"Glúteos",icon:"🍑"},
  {key:"Panturrilha",label:"Panturrilha",icon:"🦿"},{key:"Core / Abdômen",label:"Core",icon:"🎯"},
];

const uid=()=>Math.random().toString(36).slice(2,9);
const calcVolume=sets=>sets.reduce((a,s)=>a+((+s.reps||0)*(+s.weight||0)),0);
const fmtDate=d=>{if(!d)return"";const[y,m,day]=d.split("-");return`${day}/${m}/${y}`;};
const DAYS_PT=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MONTHS_PT=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const dayName=d=>DAYS_PT[new Date(d+"T12:00:00").getDay()];
const detectTrainType=name=>{
  const n=(name||"").toUpperCase();
  if(n.includes("TREINO A")||n.includes("PULL"))return"A";
  if(n.includes("TREINO B")||n.includes("PUSH"))return"B";
  if((n.includes("TREINO C")||n.includes("QUAD"))&&!n.includes("UPPER"))return"C";
  if(n.includes("TREINO D")||n.includes("UPPER")||n.includes("SUPERIOR"))return"D";
  if(n.includes("TREINO E")||n.includes("POST")||n.includes("LOWER"))return"E";
  return null;
};

const INITIAL_SESSIONS=[
  {id:"s1",date:"2025-04-04",name:"Treino C – Legs (Quadríceps + Panturrilha)",trainType:"C",exercises:[
    {id:"e1",name:"Agachamento livre",category:"Quadríceps",notes:"Última série com isometria 10-15s",sets:[{reps:15,weight:15},{reps:10,weight:30},{reps:12,weight:27.5},{reps:10,weight:25}]},
    {id:"e2",name:"Leg press 45°",category:"Quadríceps",notes:"",sets:[{reps:10,weight:110},{reps:10,weight:100},{reps:10,weight:90}]},
    {id:"e3",name:"Extensora",category:"Quadríceps",notes:"Última série com rest-pause",sets:[{reps:12,weight:59},{reps:10,weight:52},{reps:10,weight:52},{reps:8,weight:52}]},
    {id:"e4",name:"Agachamento búlgaro com halteres",category:"Quadríceps",notes:"Por perna",sets:[{reps:10,weight:17.5},{reps:8,weight:17.5},{reps:7,weight:16}]},
    {id:"e5",name:"Adutora na máquina",category:"Adutores / Abdutores",notes:"",sets:[{reps:15,weight:102},{reps:10,weight:111},{reps:10,weight:102}]},
    {id:"e6",name:"Panturrilha sentado (máquina)",category:"Panturrilha",notes:"",sets:[{reps:12,weight:100},{reps:15,weight:115},{reps:15,weight:130}]},
  ]},
  {id:"s2",date:"2025-04-03",name:"Treino D – Upper (Bíceps, Ombros, Peito, Costas)",trainType:"D",exercises:[
    {id:"e7",name:"Remada cavalinho",category:"Costas",notes:"Pegada aberta",sets:[{reps:12,weight:15},{reps:10,weight:35},{reps:10,weight:30},{reps:10,weight:25}]},
    {id:"e8",name:"Supino reto com halteres",category:"Peito",notes:"",sets:[{reps:12,weight:14},{reps:10,weight:26},{reps:9,weight:24},{reps:10,weight:20}]},
    {id:"e9",name:"Remada serrote unilateral",category:"Costas",notes:"",sets:[{reps:10,weight:22},{reps:8,weight:22},{reps:10,weight:20}]},
    {id:"e10",name:"Elevação lateral + frontal alternadas",category:"Ombros",notes:"10 cada",sets:[{reps:10,weight:9},{reps:9,weight:9},{reps:10,weight:8}]},
    {id:"e11",name:"Rosca direta na corda com drops",category:"Bíceps",notes:"2 drops na última série",sets:[{reps:10,weight:31.5},{reps:10,weight:31.5},{reps:10,weight:27}]},
    {id:"e12",name:"Peck deck",category:"Peito",notes:"+ parciais no final",sets:[{reps:12,weight:38.5},{reps:10,weight:38.5},{reps:10,weight:38.5}]},
    {id:"e13",name:"Encolhimento com barra (trapézio)",category:"Ombros",notes:"",sets:[{reps:12,weight:60},{reps:10,weight:60},{reps:8,weight:60}]},
  ]},
  {id:"s3",date:"2025-04-02",name:"Treino E – Lower (Posterior + Panturrilha + Core)",trainType:"E",exercises:[
    {id:"e14",name:"Mesa flexora",category:"Posterior de Coxa",notes:"Última série: isometria + parciais",sets:[{reps:15,weight:18},{reps:10,weight:38.5},{reps:8,weight:38.5},{reps:8,weight:31.5}]},
    {id:"e15",name:"Stiff com barra",category:"Posterior de Coxa",notes:"Cada lado",sets:[{reps:12,weight:20},{reps:10,weight:20},{reps:8,weight:20}]},
    {id:"e16",name:"Leg press 45°",category:"Quadríceps",notes:"Foco glúteo/posterior",sets:[{reps:12,weight:80},{reps:8,weight:80},{reps:10,weight:72.5}]},
    {id:"e17",name:"Glute bridge",category:"Glúteos",notes:"",sets:[{reps:12,weight:0},{reps:12,weight:0},{reps:12,weight:0}]},
    {id:"e18",name:"Abdutora na máquina",category:"Adutores / Abdutores",notes:"",sets:[{reps:10,weight:120},{reps:10,weight:111},{reps:10,weight:111}]},
    {id:"e19",name:"Panturrilha em pé (máquina)",category:"Panturrilha",notes:"",sets:[{reps:12,weight:60},{reps:12,weight:60},{reps:10,weight:60}]},
  ]},
  {id:"s4",date:"2025-03-30",name:"Treino A – Pull (Costas, Bíceps, Antebraço)",trainType:"A",exercises:[
    {id:"e20",name:"Rosca 45° com halteres",category:"Bíceps",notes:"Última série com drop set",sets:[{reps:15,weight:7},{reps:10,weight:12.5},{reps:8,weight:12.5},{reps:9,weight:10}]},
    {id:"e21",name:"Rosca Scott com barra W",category:"Bíceps",notes:"",sets:[{reps:8,weight:28},{reps:10,weight:23},{reps:8,weight:23}]},
    {id:"e22",name:"Puxada alta com barra reta",category:"Costas",notes:"Rest-pause na última série",sets:[{reps:9,weight:60},{reps:8,weight:60},{reps:9,weight:50}]},
    {id:"e23",name:"Remada curvada com barra",category:"Costas",notes:"",sets:[{reps:12,weight:30},{reps:8,weight:30},{reps:10,weight:25}]},
    {id:"e24",name:"Remada baixa com triângulo",category:"Costas",notes:"",sets:[{reps:10,weight:60},{reps:7,weight:60},{reps:10,weight:50}]},
    {id:"e25",name:"Pullover com corda na polia",category:"Costas",notes:"",sets:[{reps:10,weight:50},{reps:8,weight:50},{reps:9,weight:40}]},
    {id:"e26",name:"Rosca inversa (barra)",category:"Antebraço",notes:"",sets:[{reps:8,weight:40},{reps:10,weight:30},{reps:9,weight:25}]},
    {id:"e27",name:"Flexão de punho (polia alta)",category:"Antebraço",notes:"",sets:[{reps:10,weight:30},{reps:10,weight:25},{reps:10,weight:25}]},
    {id:"e28",name:"Exercício escapular",category:"Escapular / Mobilidade",notes:"",sets:[{reps:12,weight:25},{reps:12,weight:25},{reps:10,weight:25}]},
  ]},
  {id:"s5",date:"2025-03-29",name:"Treino B – Push (Peito, Ombro, Tríceps)",trainType:"B",exercises:[
    {id:"e29",name:"Supino inclinado com halteres",category:"Peito",notes:"Última série rest-pause",sets:[{reps:15,weight:10},{reps:10,weight:22.5},{reps:8,weight:20},{reps:10,weight:17.5}]},
    {id:"e30",name:"Crucifixo no cross (cabo alto)",category:"Peito",notes:"+ 6 parciais por série",sets:[{reps:12,weight:27},{reps:10,weight:27},{reps:10,weight:22.5}]},
    {id:"e31",name:"Desenvolvimento no aparelho",category:"Ombros",notes:"",sets:[{reps:15,weight:9},{reps:10,weight:31.5},{reps:10,weight:27},{reps:10,weight:22.5}]},
    {id:"e32",name:"Elevação lateral com drops",category:"Ombros",notes:"Parciais + completas",sets:[{reps:12,weight:16},{reps:12,weight:14},{reps:12,weight:14}]},
    {id:"e33",name:"Posterior de ombro no cross",category:"Ombros",notes:"Unilateral",sets:[{reps:10,weight:10},{reps:10,weight:10},{reps:8,weight:10}]},
    {id:"e34",name:"Tríceps testa na polia unilateral",category:"Tríceps",notes:"",sets:[{reps:8,weight:22.5},{reps:10,weight:18},{reps:9,weight:18}]},
    {id:"e35",name:"Tríceps na polia com corda",category:"Tríceps",notes:"",sets:[{reps:12,weight:30},{reps:10,weight:40},{reps:8,weight:40}]},
    {id:"e36",name:"Tríceps francês no cross com corda",category:"Tríceps",notes:"",sets:[{reps:10,weight:30},{reps:8,weight:30}]},
  ]},
];

// ══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App(){
  const[sessions,setSessions]=useState(()=>{
    try{const s=localStorage.getItem("wkv3");return s?JSON.parse(s):INITIAL_SESSIONS;}catch{return INITIAL_SESSIONS;}
  });
  const[tab,setTab]=useState("home");
  const[activeSession,setActiveSession]=useState(null);
  const[histEx,setHistEx]=useState(null);
  const[swapEx,setSwapEx]=useState(null);
  const[calYear,setCalYear]=useState(new Date().getFullYear());
  const prevTab=useRef("home");

  useEffect(()=>{try{localStorage.setItem("wkv3",JSON.stringify(sessions));}catch{}},[sessions]);

  const saveSession=s=>setSessions(prev=>{const i=prev.findIndex(x=>x.id===s.id);if(i>=0){const n=[...prev];n[i]=s;return n;}return[s,...prev];});
  const deleteSession=id=>{setSessions(p=>p.filter(s=>s.id!==id));setTab("home");};
  const getExHist=name=>sessions.filter(s=>s.exercises.some(e=>e.name===name))
    .map(s=>{const ex=s.exercises.find(e=>e.name===name);return{date:s.date,sessionName:s.name,sets:ex.sets,notes:ex.notes};})
    .sort((a,b)=>b.date.localeCompare(a.date));
  const getLastSess=name=>getExHist(name)[0]||null;

  const goTo=(t,extra={})=>{prevTab.current=tab;if(extra.session!==undefined)setActiveSession(extra.session);if(extra.ex!==undefined)setHistEx(extra.ex);if(extra.swap!==undefined)setSwapEx(extra.swap);setTab(t);};

  if(tab==="session"&&activeSession) return <SessionView session={activeSession} isNew={false} onSave={s=>{saveSession(s);setTab("home");}} onDelete={()=>deleteSession(activeSession.id)} onBack={()=>setTab("home")} onHistClick={n=>goTo("ex-hist",{ex:n})} onSwap={ex=>goTo("swap",{swap:ex})} getLastSess={getLastSess}/>;
  if(tab==="new-session") return <SessionView session={{id:uid(),date:new Date().toISOString().slice(0,10),name:"",trainType:null,exercises:[]}} isNew onSave={s=>{saveSession(s);setTab("home");}} onDelete={null} onBack={()=>setTab("home")} onHistClick={n=>goTo("ex-hist",{ex:n})} onSwap={ex=>goTo("swap",{swap:ex})} getLastSess={getLastSess}/>;
  if(tab==="ex-hist") return <HistView exName={histEx} history={getExHist(histEx)} onBack={()=>setTab(prevTab.current)}/>;
  if(tab==="swap") return <SwapView exercise={swapEx} onBack={()=>setTab(prevTab.current)}/>;

  const sorted=[...sessions].sort((a,b)=>b.date.localeCompare(a.date));

  return(
    <div style={S.app}>
      <div style={S.grain}/>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div><div style={S.logo}>⚡ IRON LOG</div><div style={S.logoSub}>Diário de Hipertrofia</div></div>
          <button style={S.newBtn} onClick={()=>goTo("new-session")}>+ Treino</button>
        </div>
      </header>
      <div style={S.tabBar}>
        {[["home","🏠","Início"],["calendar","📅","Calendário"],["analysis","📊","Análise"]].map(([t,icon,label])=>(
          <button key={t} style={{...S.tab,...(tab===t?S.tabActive:{})}} onClick={()=>setTab(t)}>
            <span style={{fontSize:18}}>{icon}</span><span style={{fontSize:10}}>{label}</span>
          </button>
        ))}
      </div>
      {tab==="home"&&<HomeTab sessions={sorted} onOpen={s=>goTo("session",{session:s})} onHistClick={n=>goTo("ex-hist",{ex:n})} getLastSess={getLastSess}/>}
      {tab==="calendar"&&<CalTab sessions={sessions} year={calYear} setYear={setCalYear} onOpen={s=>goTo("session",{session:s})}/>}
      {tab==="analysis"&&<AnalysisTab sessions={sessions}/>}
    </div>
  );
}

// ── HOME ───────────────────────────────────────────────────────────────────────
function HomeTab({sessions,onOpen,onHistClick,getLastSess}){
  const[q,setQ]=useState("");const[cat,setCat]=useState("Todos");
  const totalVol=sessions.reduce((a,s)=>a+s.exercises.reduce((b,e)=>b+calcVolume(e.sets),0),0);
  const cats=["Todos",...Object.keys(EXERCISE_DB)];
  const hits=q.length>1?ALL_EXERCISES.filter(e=>(cat==="Todos"||e.category===cat)&&e.name.toLowerCase().includes(q.toLowerCase())).slice(0,12):[];
  return(
    <div style={S.body}>
      <div style={S.statsBar}>
        <SC icon="🗓" label="Sessões" value={sessions.length}/>
        <SC icon="🏋️" label="Exercícios" value={new Set(sessions.flatMap(s=>s.exercises.map(e=>e.name))).size}/>
        <SC icon="📊" label="Volume" value={`${(totalVol/1000).toFixed(1)}t`}/>
      </div>
      <div style={S.section}>
        <div style={S.sT}>🔍 Buscar Exercício</div>
        <input style={S.si} placeholder="Nome do exercício..." value={q} onChange={e=>setQ(e.target.value)}/>
        {q.length>1&&<div style={S.cScroll}>{cats.map(c=><button key={c} style={{...S.chip,...(cat===c?S.chipA:{})}} onClick={()=>setCat(c)}>{c}</button>)}</div>}
        {hits.length>0&&<div style={S.exGrid}>{hits.map(ex=>{const l=getLastSess(ex.name);return(
          <button key={ex.name} style={S.exCard} onClick={()=>onHistClick(ex.name)}>
            <div style={S.exCat}>{ex.category}</div>
            <div style={S.exNm}>{ex.name}</div>
            <div style={S.exDs}>{ex.desc.slice(0,55)}{ex.desc.length>55?"…":""}</div>
            <div style={S.exLs}>{l?`${fmtDate(l.date)} · ${l.sets.length}s · ${calcVolume(l.sets).toFixed(0)}kg`:"Sem histórico"}</div>
          </button>);})}</div>}
      </div>
      <div style={S.section}>
        <div style={S.sT}>📋 Treinos Recentes</div>
        {sessions.map(s=>{
          const vol=s.exercises.reduce((a,e)=>a+calcVolume(e.sets),0);
          const tt=s.trainType||detectTrainType(s.name);
          const ti=tt?TRAIN_TYPES[tt]:null;
          return(
            <button key={s.id} style={S.sessCard} onClick={()=>onOpen(s)}>
              <div style={{...S.sessDot,background:ti?ti.color:"#555"}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={S.sessTop}>
                  <span style={S.sessNm}>{s.name||"Treino sem nome"}</span>
                  {ti&&<span style={{...S.ttBadge,background:`${ti.color}22`,color:ti.color}}>{ti.emoji} {tt}</span>}
                </div>
                <div style={S.sessMt}>{dayName(s.date)}, {fmtDate(s.date)} · {s.exercises.length} ex · {vol.toFixed(0)} kg</div>
              </div>
              <span style={S.arrow}>›</span>
            </button>);
        })}
      </div>
    </div>
  );
}

// ── CALENDAR ───────────────────────────────────────────────────────────────────
function CalTab({sessions,year,setYear,onOpen}){
  const[selDay,setSelDay]=useState(null);
  const sMap={};
  sessions.forEach(s=>{if(!sMap[s.date])sMap[s.date]=[];sMap[s.date].push(s);});

  // streak calculation
  const sorted=[...new Set(sessions.map(s=>s.date))].sort();
  let streak=0,cur=new Date().toISOString().slice(0,10);
  for(let i=sorted.length-1;i>=0;i--){
    const d=sorted[i];
    const diff=Math.round((new Date(cur+"T12:00:00")-new Date(d+"T12:00:00"))/864e5);
    if(diff<=1){streak++;cur=d;}else break;
  }

  const selSessions=selDay?(sMap[selDay]||[]):[];

  return(
    <div style={S.body}>
      <div style={S.yearNav}>
        <button style={S.yBtn} onClick={()=>setYear(y=>y-1)}>‹</button>
        <span style={S.yLbl}>{year}</span>
        <button style={S.yBtn} onClick={()=>setYear(y=>y+1)}>›</button>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:12}}>
        {Object.entries(TRAIN_TYPES).map(([k,v])=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:v.color}}/>
            <span style={{fontSize:10,color:C.sub}}>{v.emoji}{k}</span>
          </div>
        ))}
      </div>
      {streak>1&&<div style={{textAlign:"center",marginBottom:10,fontSize:12,color:C.accent}}>🔥 Sequência atual: {streak} treinos!</div>}
      <div style={S.monthsGrid}>
        {Array.from({length:12},(_,m)=>{
          const firstDay=new Date(year,m,1).getDay();
          const days=new Date(year,m+1,0).getDate();
          return(
            <div key={m} style={S.mBlock}>
              <div style={S.mLabel}>{MONTHS_PT[m]}</div>
              <div style={S.wkHdr}>{["D","S","T","Q","Q","S","S"].map((d,i)=><span key={i} style={{fontSize:8,color:C.sub,textAlign:"center"}}>{d}</span>)}</div>
              <div style={S.dGrid}>
                {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
                {Array.from({length:days},(_,i)=>{
                  const day=i+1;
                  const ds=`${year}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                  const ds2=sMap[ds]||[];
                  const today=new Date().toISOString().slice(0,10);
                  const tt=ds2[0]?(ds2[0].trainType||detectTrainType(ds2[0].name)):null;
                  const col=tt?TRAIN_TYPES[tt]?.color:null;
                  const isSel=ds===selDay,isToday=ds===today;
                  return(
                    <button key={day} style={{...S.dCell,...(isToday?{border:`1px solid ${C.accent}66`}:{}),...(isSel?{border:`1px solid ${C.accent}`}:{}),...(col?{background:`${col}30`,border:`1px solid ${col}66`}:{})}} onClick={()=>setSelDay(isSel?null:ds)}>
                      <span style={{fontSize:9,color:col||C.sub,lineHeight:1}}>{day}</span>
                      {ds2.length>0&&<div style={{width:3,height:3,borderRadius:"50%",background:col||C.accent,marginTop:1}}/>}
                    </button>);
                })}
              </div>
            </div>);
        })}
      </div>
      {selDay&&(
        <div style={S.section}>
          <div style={S.sT}>{dayName(selDay)}, {fmtDate(selDay)}</div>
          {selSessions.length===0
            ?<div style={{color:C.sub,fontSize:13,padding:"8px 0"}}>Dia de descanso 😴</div>
            :selSessions.map(s=>{
              const tt=s.trainType||detectTrainType(s.name);
              const ti=tt?TRAIN_TYPES[tt]:null;
              const vol=s.exercises.reduce((a,e)=>a+calcVolume(e.sets),0);
              return(<button key={s.id} style={S.sessCard} onClick={()=>onOpen(s)}>
                <div style={{...S.sessDot,background:ti?ti.color:"#555"}}/>
                <div style={{flex:1}}>
                  <div style={S.sessNm}>{s.name}</div>
                  <div style={S.sessMt}>{s.exercises.length} ex · {vol.toFixed(0)} kg{ti?` · ${ti.label}`:""}</div>
                </div>
                <span style={S.arrow}>›</span>
              </button>);})}
        </div>
      )}
      <div style={S.section}>
        <div style={S.sT}>📈 Frequência {year}</div>
        <div style={S.statsBar}>
          <SC icon="🗓" label="Treinos" value={sessions.filter(s=>s.date.startsWith(String(year))).length}/>
          <SC icon="🔥" label="Streak" value={`${streak}x`}/>
          <SC icon="💪" label="Esta semana" value={`${sessions.filter(s=>{const d=new Date(s.date+"T12:00:00"),n=new Date();return(n-d)/864e5<7;}).length}x`}/>
        </div>
      </div>
    </div>
  );
}

// ── ANALYSIS ───────────────────────────────────────────────────────────────────
function AnalysisTab({sessions}){
  const[period,setPeriod]=useState(30);
  const[selTT,setSelTT]=useState("A");
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-period);
  const recent=sessions.filter(s=>new Date(s.date+"T12:00:00")>=cutoff);
  const mSets={},mVol={};
  MUSCLE_GROUPS.forEach(m=>{mSets[m.key]=0;mVol[m.key]=0;});
  recent.forEach(s=>s.exercises.forEach(e=>{if(mSets[e.category]!==undefined){mSets[e.category]+=e.sets.length;mVol[e.category]+=calcVolume(e.sets);}}));
  const maxS=Math.max(...MUSCLE_GROUPS.map(m=>mSets[m.key]),1);
  const alerts=[];
  [["Peito","Costas"],["Bíceps","Tríceps"],["Quadríceps","Posterior de Coxa"]].forEach(([a,b])=>{
    const sa=mSets[a]||0,sb=mSets[b]||0;
    if(sa+sb>0){const r=sa/(sa+sb);if(r>0.65)alerts.push({msg:`${a} com muito mais volume que ${b} (${sa}s vs ${sb}s). Equilíbrio push/pull recomendado.`,level:"warn"});else if(r<0.35)alerts.push({msg:`${b} com muito mais volume que ${a} (${sb}s vs ${sa}s). Equilíbrio push/pull recomendado.`,level:"warn"});}
  });
  MUSCLE_GROUPS.forEach(m=>{if(mSets[m.key]===0)alerts.push({msg:`${m.label} não foi treinado nos últimos ${period} dias!`,level:"error"});});
  const ttCount={};recent.forEach(s=>{const tt=s.trainType||detectTrainType(s.name)||"?";ttCount[tt]=(ttCount[tt]||0)+1;});

  return(
    <div style={S.body}>
      <div style={S.section}>
        <div style={S.sT}>⏱ Período</div>
        <div style={S.cRow}>{[7,14,30,60,90].map(d=><button key={d} style={{...S.chip,...(period===d?S.chipA:{})}} onClick={()=>setPeriod(d)}>{d}d</button>)}</div>
      </div>
      {alerts.length>0&&(
        <div style={S.section}>
          <div style={S.sT}>⚠️ Alertas de Equilíbrio</div>
          {alerts.map((al,i)=><div key={i} style={{...S.alertBox,...(al.level==="error"?S.alertE:S.alertW)}}>{al.level==="error"?"🚨":"⚠️"} {al.msg}</div>)}
        </div>
      )}
      <div style={S.section}>
        <div style={S.sT}>💪 Volume por Grupamento</div>
        {MUSCLE_GROUPS.map(m=>{
          const s=mSets[m.key];const p=maxS>0?s/maxS:0;
          return(<div key={m.key} style={S.mRow}>
            <div style={S.mLbl}><span>{m.icon}</span><span style={{fontSize:11}}>{m.label}</span></div>
            <div style={S.mBarW}><div style={{...S.mBar,width:`${p*100}%`,background:p>0.6?C.accent:p>0.3?"#4fc3f7":"#3a3a55"}}/></div>
            <div style={S.mSets}>{s}s</div>
          </div>);
        })}
      </div>
      <div style={S.section}>
        <div style={S.sT}>🔄 Distribuição ABCDE</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {Object.entries(TRAIN_TYPES).map(([k,v])=>(
            <div key={k} style={{background:C.surface,border:`1px solid ${v.color}55`,borderRadius:10,padding:"10px 14px",textAlign:"center",minWidth:56}}>
              <div style={{fontSize:18}}>{v.emoji}</div>
              <div style={{fontSize:22,fontWeight:800,color:v.color}}>{ttCount[k]||0}</div>
              <div style={{fontSize:10,color:C.sub}}>{k}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={S.section}>
        <div style={S.sT}>📚 Periodização — Fabrício Pacholok</div>
        <div style={S.cRow}>{["A","B","C","D","E"].map(t=><button key={t} style={{...S.chip,...(selTT===t?{...S.chipA,background:`${TRAIN_TYPES[t].color}22`,borderColor:TRAIN_TYPES[t].color,color:TRAIN_TYPES[t].color}:{})}} onClick={()=>setSelTT(t)}>{TRAIN_TYPES[t].emoji} {t}</button>)}</div>
        <div style={{marginTop:10}}>{PERIODIZATION_TIPS[selTT].map((tip,i)=>(
          <div key={i} style={S.tipCard}>
            <div style={S.tipPh}>{tip.phase}</div>
            <div style={S.tipTx}>{tip.tip}</div>
          </div>))}</div>
        <div style={S.pNote}>💡 Periodização ondulatória: Acumulação → Intensificação → Realização. Cada bloco de 4 semanas tem objetivo distinto. Baseado nos princípios de Fabrício Pacholok para hipertrofia avançada.</div>
      </div>
    </div>
  );
}

// ── SESSION VIEW ───────────────────────────────────────────────────────────────
function SessionView({session,isNew,onSave,onDelete,onBack,onHistClick,onSwap,getLastSess}){
  const[data,setData]=useState(()=>JSON.parse(JSON.stringify(session)));
  const[showPicker,setShowPicker]=useState(false);
  const[q,setQ]=useState("");const[cat,setCat]=useState("Todos");
  const[exp,setExp]=useState(isNew?[]:session.exercises.map(e=>e.id));
  const[confirmDel,setConfirmDel]=useState(false);

  const mut=fn=>{setData(p=>{const n=JSON.parse(JSON.stringify(p));fn(n);return n;});};
  const addEx=ex=>{const id=uid();mut(d=>d.exercises.push({id,name:ex.name,category:ex.category,notes:"",sets:[{reps:"",weight:""}]}));setExp(p=>[...p,id]);setShowPicker(false);setQ("");};
  const rmEx=eid=>mut(d=>{d.exercises=d.exercises.filter(e=>e.id!==eid);});
  const addSet=eid=>mut(d=>{const ex=d.exercises.find(e=>e.id===eid);const l=ex.sets[ex.sets.length-1]||{reps:"",weight:""};ex.sets.push({reps:l.reps,weight:l.weight});});
  const rmSet=(eid,si)=>mut(d=>{d.exercises.find(e=>e.id===eid).sets.splice(si,1);});
  const updS=(eid,si,f,v)=>mut(d=>{d.exercises.find(e=>e.id===eid).sets[si][f]=v===""?"":(parseFloat(v)||0);});
  const updN=(eid,v)=>mut(d=>{d.exercises.find(e=>e.id===eid).notes=v;});
  const togEx=id=>setExp(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  const cats=["Todos",...Object.keys(EXERCISE_DB)];
  const filtEx=ALL_EXERCISES.filter(e=>(cat==="Todos"||e.category===cat)&&(q.length<2||e.name.toLowerCase().includes(q.toLowerCase())));
  const totalVol=data.exercises.reduce((a,e)=>a+calcVolume(e.sets),0);
  const tt=data.trainType||detectTrainType(data.name);
  const ti=tt?TRAIN_TYPES[tt]:null;

  return(
    <div style={S.app}>
      <div style={S.grain}/>
      <header style={S.sessHdr}>
        <button style={S.back} onClick={onBack}>← Voltar</button>
        <div style={{flex:1,textAlign:"center",fontSize:13,fontWeight:700,color:C.text}}>{isNew?"Novo Treino":"Editar"}</div>
        <button style={S.saveB} onClick={()=>onSave(data)}>✓ Salvar</button>
      </header>
      <div style={S.body}>
        <div style={S.metaCard}>
          <div style={S.mRow2}><label style={S.mLbl2}>Data</label><input type="date" style={S.mIn} value={data.date} onChange={e=>mut(d=>d.date=e.target.value)}/></div>
          <div style={S.mRow2}><label style={S.mLbl2}>Nome</label><input style={{...S.mIn,flex:1}} placeholder="Ex: Treino B – Push" value={data.name} onChange={e=>{mut(d=>{d.name=e.target.value;const tt=detectTrainType(e.target.value);if(tt)d.trainType=tt;});}}/></div>
          <div style={S.cRow}>{Object.entries(TRAIN_TYPES).map(([k,v])=><button key={k} style={{...S.chip,fontSize:11,...(data.trainType===k?{background:`${v.color}22`,borderColor:v.color,color:v.color}:{})}} onClick={()=>mut(d=>d.trainType=k)}>{v.emoji} {k}</button>)}</div>
          {ti&&<div style={{fontSize:11,color:ti.color,marginTop:6}}>{ti.label} · {ti.muscles.join(", ")}</div>}
          <div style={{fontSize:11,color:C.sub,marginTop:8}}>Volume total: <strong style={{color:C.accent}}>{totalVol.toFixed(0)} kg</strong></div>
        </div>

        {data.exercises.map(ex=>{
          const last=getLastSess(ex.name);const exVol=calcVolume(ex.sets);const isO=exp.includes(ex.id);const info=findExercise(ex.name);
          return(
            <div key={ex.id} style={S.exBlk}>
              <div style={S.exBlkH} onClick={()=>togEx(ex.id)}>
                <div style={{flex:1,minWidth:0}}><div style={S.exCat}>{ex.category}</div><div style={S.exNm2}>{ex.name}</div></div>
                <span style={S.vChip}>{exVol.toFixed(0)}kg</span>
                <span style={{color:C.sub,fontSize:11}}>{isO?"▲":"▼"}</span>
              </div>
              {isO&&(<>
                {info.desc&&<div style={S.exDsB}>📖 {info.desc}</div>}
                {last&&<button style={S.lastH} onClick={()=>onHistClick(ex.name)}>
                  <span>⏱</span>
                  <div><div style={{fontSize:11,color:C.green,fontWeight:600}}>Último: {fmtDate(last.date)}</div>
                  <div style={{fontSize:11,color:C.sub,marginTop:1}}>{last.sets.map(s=>`${s.reps}×${s.weight}kg`).join(" · ")}</div></div>
                  <span style={{marginLeft:"auto",color:C.sub}}>›</span>
                </button>}
                {info.alts&&info.alts.length>0&&<button style={S.swapB} onClick={()=>onSwap(info)}>🔄 Ver similares ({info.alts.length})</button>}
                <input style={S.noteIn} placeholder="Observações..." value={ex.notes} onChange={e=>updN(ex.id,e.target.value)}/>
                <div style={S.sHdr}><span style={{width:24,color:C.sub,fontSize:11,textAlign:"center"}}>#</span><span style={{flex:1,color:C.sub,fontSize:11,textAlign:"center"}}>Reps</span><span style={{flex:1,color:C.sub,fontSize:11,textAlign:"center"}}>Peso kg</span><span style={{flex:1,color:C.sub,fontSize:11,textAlign:"center"}}>Vol</span><span style={{width:24}}/></div>
                {ex.sets.map((s,si)=>(
                  <div key={si} style={S.sRow}>
                    <span style={S.sNum}>{si+1}</span>
                    <input style={S.sIn} type="number" placeholder="0" value={s.reps} onChange={e=>updS(ex.id,si,"reps",e.target.value)}/>
                    <input style={S.sIn} type="number" placeholder="0" step="0.5" value={s.weight} onChange={e=>updS(ex.id,si,"weight",e.target.value)}/>
                    <span style={S.sVol}>{((+s.reps||0)*(+s.weight||0)).toFixed(0)}</span>
                    <button style={S.sDel} onClick={()=>rmSet(ex.id,si)}>×</button>
                  </div>
                ))}
                <div style={S.sActs}>
                  <button style={S.addSB} onClick={()=>addSet(ex.id)}>+ Série</button>
                  <button style={S.rmExB} onClick={()=>rmEx(ex.id)}>Remover</button>
                </div>
              </>)}
            </div>
          );
        })}

        <button style={S.addExB} onClick={()=>setShowPicker(true)}>+ Adicionar Exercício</button>
        {!isNew&&onDelete&&<div style={{textAlign:"center",marginBottom:40}}>
          {!confirmDel?<button style={S.dangerB} onClick={()=>setConfirmDel(true)}>🗑 Excluir Treino</button>
          :<div><div style={{color:"#ff5555",fontSize:13,marginBottom:8}}>Tem certeza?</div>
            <button style={{...S.dangerB,marginRight:8}} onClick={onDelete}>Sim</button>
            <button style={S.ghostB} onClick={()=>setConfirmDel(false)}>Cancelar</button></div>}
        </div>}
      </div>

      {showPicker&&(
        <div style={S.modal} onClick={()=>setShowPicker(false)}>
          <div style={S.mBox} onClick={e=>e.stopPropagation()}>
            <div style={S.mHdr}><span style={{fontWeight:700}}>Escolher Exercício</span><button style={S.mClose} onClick={()=>setShowPicker(false)}>×</button></div>
            <input autoFocus style={S.mSearch} placeholder="Buscar..." value={q} onChange={e=>setQ(e.target.value)}/>
            <div style={{...S.cScroll,padding:"0 14px 8px"}}>{cats.map(c=><button key={c} style={{...S.chip,...(cat===c?S.chipA:{})}} onClick={()=>setCat(c)}>{c}</button>)}</div>
            <div style={S.mList}>{filtEx.slice(0,40).map(ex=>(
              <button key={ex.name} style={S.mExI} onClick={()=>addEx(ex)}>
                <span style={S.exCat}>{ex.category}</span>
                <span style={{fontSize:14,color:C.text}}>{ex.name}</span>
                {ex.desc&&<span style={{fontSize:11,color:C.sub,marginTop:2}}>{ex.desc.slice(0,60)}…</span>}
              </button>))}
              {filtEx.length===0&&<div style={{color:C.sub,padding:16}}>Nenhum resultado</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SWAP VIEW ──────────────────────────────────────────────────────────────────
function SwapView({exercise,onBack}){
  if(!exercise)return null;
  const alts=(exercise.alts||[]).map(name=>findExercise(name)).filter(e=>e.name);
  return(
    <div style={S.app}>
      <div style={S.grain}/>
      <header style={S.sessHdr}>
        <button style={S.back} onClick={onBack}>← Voltar</button>
        <div style={{flex:1,textAlign:"center",fontSize:13,fontWeight:700,color:C.text}}>Exercícios Similares</div>
        <div style={{width:70}}/>
      </header>
      <div style={S.body}>
        <div style={{marginBottom:16}}>
          <div style={S.exCat}>{exercise.category}</div>
          <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:6}}>{exercise.name}</div>
          {exercise.desc&&<div style={{fontSize:13,color:C.sub,lineHeight:1.6}}>{exercise.desc}</div>}
        </div>
        <div style={S.sT}>🔄 Alternativas com Padrão Similar</div>
        {alts.length===0&&<div style={{color:C.sub}}>Sem alternativas cadastradas.</div>}
        {alts.map((alt,i)=>(
          <div key={i} style={S.altCard}>
            <div style={S.exCat}>{alt.category}</div>
            <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:4}}>{alt.name}</div>
            <div style={{fontSize:12,color:C.sub,lineHeight:1.5}}>{alt.desc}</div>
            {alt.alts&&alt.alts.length>0&&<div style={{marginTop:6,fontSize:11,color:C.sub}}>Outras opções: {alt.alts.filter(a=>a!==exercise.name).slice(0,2).join(", ")}</div>}
          </div>
        ))}
        <div style={S.pNote}>💡 Troque exercícios mantendo o padrão de movimento (empurrar vertical → empurrar vertical). Segundo Pacholok, variações devem ocorrer a cada bloco de 4 semanas, não semanalmente. Priorize movimentos compostos para troca de estímulo.</div>
      </div>
    </div>
  );
}

// ── HISTORY VIEW ───────────────────────────────────────────────────────────────
function HistView({exName,history,onBack}){
  const vols=history.map(h=>({date:h.date,vol:calcVolume(h.sets)})).reverse();
  const maxV=Math.max(...vols.map(v=>v.vol),1);
  const info=findExercise(exName);
  return(
    <div style={S.app}>
      <div style={S.grain}/>
      <header style={S.sessHdr}>
        <button style={S.back} onClick={onBack}>← Voltar</button>
        <div style={{flex:1,textAlign:"center",fontSize:13,fontWeight:700,color:C.text}}>Histórico</div>
        <div style={{width:70}}/>
      </header>
      <div style={S.body}>
        <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:4}}>{exName}</div>
        {info.desc&&<div style={{fontSize:12,color:C.sub,marginBottom:14,lineHeight:1.5}}>{info.desc}</div>}
        {history.length===0&&<div style={{color:C.sub,padding:"20px 0"}}>Sem histórico ainda.</div>}
        {vols.length>1&&(
          <div style={S.chartBox}>
            <div style={S.sT}>📈 Progressão de Volume</div>
            <div style={{display:"flex",alignItems:"flex-end",gap:6,height:110,overflowX:"auto",paddingBottom:4}}>
              {vols.map((v,i)=>(
                <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,minWidth:44}}>
                  <span style={{fontSize:9,color:C.accent,marginBottom:2}}>{v.vol.toFixed(0)}</span>
                  <div style={{width:28,background:`linear-gradient(to top,${C.accent},${C.accent}55)`,borderRadius:"3px 3px 0 0",height:`${(v.vol/maxV)*96}px`,minHeight:4}}/>
                  <span style={{fontSize:8,color:C.sub,marginTop:3}}>{fmtDate(v.date).slice(0,5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {history.map((h,i)=>{
          const vol=calcVolume(h.sets);const best=h.sets.reduce((a,s)=>Math.max(a,+s.weight||0),0);
          return(
            <div key={i} style={S.hCard}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <div><div style={{fontSize:13,fontWeight:700,color:C.text}}>{dayName(h.date)}, {fmtDate(h.date)}</div><div style={{fontSize:11,color:C.sub,marginTop:2}}>{h.sessionName}</div></div>
                <div style={{textAlign:"right"}}><div style={{fontSize:17,fontWeight:800,color:C.accent}}>{vol.toFixed(0)}</div><div style={{fontSize:9,color:C.sub}}>kg vol</div></div>
              </div>
              {h.notes&&<div style={{fontSize:11,color:C.sub,marginBottom:8,fontStyle:"italic"}}>📝 {h.notes}</div>}
              <div style={S.sHdr}><span style={{width:24,color:C.sub,fontSize:11,textAlign:"center"}}>#</span><span style={{flex:1,color:C.sub,fontSize:11,textAlign:"center"}}>Reps</span><span style={{flex:1,color:C.sub,fontSize:11,textAlign:"center"}}>Peso</span><span style={{flex:1,color:C.sub,fontSize:11,textAlign:"center"}}>Vol</span></div>
              {h.sets.map((s,si)=>(
                <div key={si} style={{...S.sRow,cursor:"default"}}>
                  <span style={S.sNum}>{si+1}</span>
                  <span style={{flex:1,textAlign:"center",fontSize:13,color:C.text}}>{s.reps}</span>
                  <span style={{flex:1,textAlign:"center",fontSize:13,color:C.text}}>{s.weight}kg</span>
                  <span style={S.sVol}>{((+s.reps||0)*(+s.weight||0)).toFixed(0)}</span>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`,fontSize:11,color:C.sub}}>
                <span>💪 Carga máx: <strong style={{color:C.accent}}>{best}kg</strong></span>
                <span>📊 {h.sets.length} séries</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SC({icon,label,value}){
  return(<div style={S.statCard}><div style={{fontSize:20}}>{icon}</div><div style={{fontSize:19,fontWeight:800,color:C.accent}}>{value}</div><div style={{fontSize:10,color:C.sub,marginTop:1}}>{label}</div></div>);
}

// ══════════════════════════════════════════════════════════════════════════════
// TOKENS & STYLES
// ══════════════════════════════════════════════════════════════════════════════
const C={bg:"#0a0a0c",surface:"#14151a",surface2:"#1c1d24",border:"#252630",accent:"#f5a623",accentD:"rgba(245,166,35,.12)",text:"#e8e8ef",sub:"#7a7a95",green:"#2ecc71",danger:"#ff4455"};

const S={
  app:{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans','Segoe UI',sans-serif",color:C.text,maxWidth:680,margin:"0 auto",position:"relative"},
  grain:{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,opacity:.03,backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",backgroundSize:"150px"},
  header:{position:"sticky",top:0,zIndex:100,background:"rgba(10,10,12,.96)",backdropFilter:"blur(14px)",borderBottom:`1px solid ${C.border}`,padding:"12px 18px"},
  headerInner:{display:"flex",alignItems:"center",justifyContent:"space-between"},
  logo:{fontSize:22,fontWeight:800,letterSpacing:"-.5px",color:C.accent},
  logoSub:{fontSize:11,color:C.sub,letterSpacing:".5px",marginTop:1},
  newBtn:{background:C.accent,color:"#000",border:"none",borderRadius:8,padding:"8px 16px",fontWeight:700,fontSize:13,cursor:"pointer"},
  tabBar:{display:"flex",background:C.surface,borderBottom:`1px solid ${C.border}`},
  tab:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"10px 4px",background:"none",border:"none",color:C.sub,cursor:"pointer"},
  tabActive:{color:C.accent,borderBottom:`2px solid ${C.accent}`},
  body:{padding:"16px 16px 60px",position:"relative",zIndex:1},
  statsBar:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16},
  statCard:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 8px",textAlign:"center"},
  section:{marginBottom:20},
  sT:{fontSize:11,fontWeight:700,color:C.sub,letterSpacing:".8px",textTransform:"uppercase",marginBottom:10},
  si:{width:"100%",boxSizing:"border-box",background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.text,fontSize:15,outline:"none",marginBottom:8},
  cScroll:{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,scrollbarWidth:"none"},
  cRow:{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8},
  chip:{flexShrink:0,background:C.surface2,border:`1px solid ${C.border}`,borderRadius:20,padding:"5px 12px",fontSize:12,color:C.sub,cursor:"pointer",whiteSpace:"nowrap"},
  chipA:{background:C.accentD,borderColor:C.accent,color:C.accent},
  exGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8},
  exCard:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px",textAlign:"left",cursor:"pointer"},
  exCat:{fontSize:9,color:C.accent,textTransform:"uppercase",letterSpacing:".5px",marginBottom:2},
  exNm:{fontSize:13,fontWeight:600,color:C.text,marginBottom:3,lineHeight:1.3},
  exDs:{fontSize:10,color:C.sub,lineHeight:1.4,marginBottom:4},
  exLs:{fontSize:10,color:C.sub},
  sessCard:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left",width:"100%",marginBottom:8},
  sessDot:{width:10,height:10,borderRadius:"50%",flexShrink:0},
  sessTop:{display:"flex",alignItems:"center",gap:8,marginBottom:3},
  sessNm:{fontSize:14,fontWeight:600,color:C.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  ttBadge:{fontSize:10,fontWeight:700,borderRadius:20,padding:"2px 8px",flexShrink:0},
  sessMt:{fontSize:11,color:C.sub},
  arrow:{fontSize:20,color:C.sub},
  // Calendar
  yearNav:{display:"flex",alignItems:"center",justifyContent:"center",gap:20,padding:"12px 0"},
  yBtn:{background:"none",border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:20,width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},
  yLbl:{fontSize:20,fontWeight:800,color:C.text},
  monthsGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16},
  mBlock:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px"},
  mLabel:{fontSize:11,fontWeight:700,color:C.text,marginBottom:4,textAlign:"center"},
  wkHdr:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:2},
  dGrid:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1},
  dCell:{aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",borderRadius:3,background:"none",border:"1px solid transparent",cursor:"pointer",padding:0},
  // Analysis
  mRow:{display:"flex",alignItems:"center",gap:8,marginBottom:8},
  mLbl:{display:"flex",alignItems:"center",gap:4,width:88,flexShrink:0},
  mBarW:{flex:1,background:C.surface2,borderRadius:4,height:7,overflow:"hidden"},
  mBar:{height:"100%",borderRadius:4,transition:"width .3s"},
  mSets:{width:28,textAlign:"right",fontSize:12,color:C.accent,fontWeight:600},
  alertBox:{padding:"10px 14px",borderRadius:10,marginBottom:8,fontSize:13,lineHeight:1.5},
  alertW:{background:"rgba(255,183,77,.1)",border:"1px solid rgba(255,183,77,.3)",color:"#ffb74d"},
  alertE:{background:"rgba(255,68,85,.1)",border:"1px solid rgba(255,68,85,.3)",color:"#ff6677"},
  tipCard:{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px",marginBottom:10},
  tipPh:{fontSize:12,fontWeight:700,color:C.accent,marginBottom:6},
  tipTx:{fontSize:13,color:C.text,lineHeight:1.6},
  pNote:{background:"rgba(245,166,35,.06)",border:"1px solid rgba(245,166,35,.2)",borderRadius:10,padding:"12px",fontSize:12,color:C.sub,lineHeight:1.6,marginTop:12},
  // Session
  sessHdr:{position:"sticky",top:0,zIndex:100,background:"rgba(10,10,12,.96)",backdropFilter:"blur(14px)",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"12px 14px",gap:8},
  back:{background:"none",border:"none",color:C.sub,fontSize:13,cursor:"pointer",padding:"4px 8px"},
  saveB:{background:C.accent,color:"#000",border:"none",borderRadius:8,padding:"7px 14px",fontWeight:700,fontSize:13,cursor:"pointer"},
  metaCard:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px",marginBottom:14},
  mRow2:{display:"flex",alignItems:"center",gap:10,marginBottom:10},
  mLbl2:{fontSize:12,color:C.sub,width:36},
  mIn:{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:14,outline:"none"},
  exBlk:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:10,overflow:"hidden"},
  exBlkH:{display:"flex",alignItems:"center",padding:"12px 14px",cursor:"pointer",gap:8},
  exNm2:{fontSize:15,fontWeight:700,color:C.text},
  vChip:{background:C.accentD,border:`1px solid ${C.accent}44`,borderRadius:20,padding:"2px 10px",fontSize:11,color:C.accent,fontWeight:600},
  exDsB:{fontSize:12,color:C.sub,lineHeight:1.5,padding:"0 14px 10px",fontStyle:"italic"},
  lastH:{display:"flex",alignItems:"center",gap:10,background:"rgba(46,204,113,.06)",border:"1px solid rgba(46,204,113,.2)",borderRadius:8,margin:"0 14px 10px",padding:"8px 12px",cursor:"pointer",textAlign:"left",width:"calc(100% - 28px)"},
  swapB:{display:"block",margin:"0 14px 10px",background:"rgba(79,195,247,.08)",border:"1px solid rgba(79,195,247,.25)",borderRadius:8,padding:"7px 12px",fontSize:12,color:"#4fc3f7",cursor:"pointer",textAlign:"left"},
  noteIn:{display:"block",width:"calc(100% - 32px)",margin:"0 14px 10px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 10px",color:C.sub,fontSize:12,outline:"none"},
  sHdr:{display:"flex",alignItems:"center",gap:6,padding:"4px 14px 6px"},
  sRow:{display:"flex",alignItems:"center",gap:6,padding:"4px 14px",borderTop:`1px solid ${C.border}`},
  sNum:{width:24,textAlign:"center",fontSize:12,color:C.sub,flexShrink:0},
  sIn:{flex:1,background:C.surface2,border:`1px solid ${C.border}`,borderRadius:7,padding:"7px 4px",color:C.text,fontSize:14,textAlign:"center",outline:"none",minWidth:0},
  sVol:{flex:1,textAlign:"center",fontSize:13,color:C.accent,fontWeight:600},
  sDel:{width:24,background:"none",border:"none",color:C.danger,fontSize:18,cursor:"pointer",flexShrink:0},
  sActs:{display:"flex",justifyContent:"space-between",padding:"10px 14px 12px"},
  addSB:{background:C.accentD,border:`1px solid ${C.accent}44`,borderRadius:8,padding:"6px 14px",color:C.accent,fontWeight:600,fontSize:13,cursor:"pointer"},
  rmExB:{background:"transparent",border:"1px solid rgba(255,68,85,.3)",borderRadius:8,padding:"6px 12px",color:C.danger,fontSize:12,cursor:"pointer"},
  addExB:{display:"block",width:"100%",padding:"14px",background:C.surface,border:`2px dashed ${C.border}`,borderRadius:12,color:C.sub,fontSize:14,fontWeight:600,cursor:"pointer",marginBottom:20},
  dangerB:{background:"transparent",border:"1px solid rgba(255,68,85,.4)",borderRadius:8,padding:"8px 18px",color:C.danger,fontSize:13,cursor:"pointer"},
  ghostB:{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 18px",color:C.sub,fontSize:13,cursor:"pointer"},
  modal:{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:200,display:"flex",alignItems:"flex-end"},
  mBox:{background:C.surface,borderTop:`1px solid ${C.border}`,borderRadius:"20px 20px 0 0",width:"100%",maxHeight:"80vh",display:"flex",flexDirection:"column"},
  mHdr:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px 10px"},
  mClose:{background:"none",border:"none",color:C.sub,fontSize:24,cursor:"pointer"},
  mSearch:{margin:"0 16px 10px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.text,fontSize:15,outline:"none"},
  mList:{flex:1,overflowY:"auto",padding:"0 0 20px"},
  mExI:{display:"flex",flexDirection:"column",alignItems:"flex-start",width:"100%",padding:"10px 18px",border:"none",borderTop:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",textAlign:"left"},
  chartBox:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px",marginBottom:14},
  hCard:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px",marginBottom:10},
  altCard:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px",marginBottom:10},
};
