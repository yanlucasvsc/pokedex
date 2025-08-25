/**
 * ========================================
 * POKÉDX DIGITAL - JAVASCRIPT PRINCIPAL
 * Sistema completo de gerenciamento da Pokédex
 * COM FILTRO DINÂMICO POR REGIÃO
 * ========================================
 */

class PokedexApp {
  constructor() {
    // === PROPRIEDADES PRINCIPAIS ===
    this.allPokemon = [];           // Array com todos os Pokémon carregados
    this.filteredPokemon = [];      // Array com Pokémon filtrados para exibição
    this.currentPokemonId = null;   // ID do Pokémon atualmente visualizado no modal
    this.typeCache = {};            // Cache dos tipos para evitar requisições desnecessárias
    this.currentType = '';          // Tipo atualmente selecionado no filtro
    this.currentRegion = '';        // Região atualmente selecionada no filtro
    this.isLoading = false;         // Flag para controlar estado de carregamento
    
    // === DEFINIÇÃO DAS REGIÕES ===
    // Mapeamento das regiões com seus ranges de Pokémon
    this.regions = {
      kanto: { start: 1, end: 151, name: 'KANTO' },
      johto: { start: 152, end: 251, name: 'JOHTO' },
      hoenn: { start: 252, end: 386, name: 'HOENN' },
      sinnoh: { start: 387, end: 493, name: 'SINNOH' },
      unova: { start: 494, end: 649, name: 'UNOVA' },
      kalos: { start: 650, end: 721, name: 'KALOS' },
      alola: { start: 722, end: 809, name: 'ALOLA' },
      galar: { start: 810, end: 905, name: 'GALAR' },
      paldea: { start: 906, end: 1010, name: 'PALDEA' }
    };
    
    // Inicializa a aplicação
    this.init();
  }

  /**
   * === INICIALIZAÇÃO DA APLICAÇÃO ===
   * Carrega dados iniciais e configura eventos
   */
  async init() {
    this.showLoading();
    await this.loadInitialPokemon();
    this.setupEventListeners();
    this.updateStatus();
    this.hideLoading();
  }

  /**
   * === CONFIGURAÇÃO DE EVENTOS ===
   * Configura todos os event listeners da aplicação
   */
  setupEventListeners() {
    // Evento para busca dinâmica enquanto digita
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.dynamicSearch(e.target.value);
    });
    
    // Evento para busca por Enter no campo de input (abre modal)
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchPokemon();
      }
    });

    // Evento para mudança no select de filtro de tipo
    document.getElementById('typeFilter').addEventListener('change', () => {
      this.filterByType();
    });
    
    // Evento para mudança no select de filtro de região
    document.getElementById('regionFilter').addEventListener('change', () => {
      this.filterByRegion();
    });

    // Eventos de teclado para navegação no modal
    document.addEventListener('keydown', (e) => {
      // Verifica se o modal está aberto
      if (document.getElementById('pokemonModal').classList.contains('flex')) {
        if (e.key === 'Escape') {
          this.closeModal();  // Fecha modal com Escape
        } else if (e.key === 'ArrowLeft') {
          this.previousPokemon();  // Navega para anterior com seta esquerda
        } else if (e.key === 'ArrowRight') {
          this.nextPokemon();  // Navega para próximo com seta direita
        }
      }
    });
  }

  /**
   * === CARREGAMENTO INICIAL DOS POKÉMON ===
   * Carrega TODOS os Pokémon disponíveis (1010+)
   */
  async loadInitialPokemon() {
    try {
      // Busca lista de TODOS os Pokémon disponíveis
      const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1010');
      const data = await response.json();
      
      // Carrega em lotes para melhor performance
      const BATCH_SIZE = 50;
      this.allPokemon = [];
      
      for (let i = 0; i < data.results.length; i += BATCH_SIZE) {
        const batch = data.results.slice(i, i + BATCH_SIZE);
        
        // Cria array de promises para buscar dados completos do lote
        const pokemonPromises = batch.map(async (pokemon) => {
          try {
            const pokemonResponse = await fetch(pokemon.url);
            return await pokemonResponse.json();
          } catch (error) {
            console.error(`Erro ao carregar ${pokemon.name}:`, error);
            return null;
          }
        });
        
        // Executa requisições do lote em paralelo
        const batchResults = await Promise.all(pokemonPromises);
        
        // Adiciona resultados válidos ao array principal
        this.allPokemon.push(...batchResults.filter(pokemon => pokemon !== null));
        
        // Atualiza status de carregamento
        if (document.getElementById('totalFound')) {
          document.getElementById('totalFound').textContent = this.allPokemon.length;
        }
        
        // Pequeno delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      this.filteredPokemon = [...this.allPokemon];  // Copia array para filtros
      this.renderPokemon();  // Renderiza os Pokémon na tela
    } catch (error) {
      console.error('Erro ao carregar Pokémon:', error);
    }
  }

  /**
   * === RENDERIZAÇÃO DOS POKÉMON ===
   * Cria e exibe os cards dos Pokémon na grade
   */
  renderPokemon() {
    const grid = document.getElementById('pokemonGrid');
    if (!grid) return;
    
    grid.innerHTML = '';  // Limpa grade atual

    // Cria um card para cada Pokémon filtrado
    this.filteredPokemon.forEach(pokemon => {
      const card = document.createElement('div');
      card.className = 'pokemon-card pokedex-card p-3 cursor-pointer';
      card.onclick = () => this.showPokemonDetails(pokemon.id);
      
      // HTML do card com informações básicas
      card.innerHTML = `
        <div class="text-center">
          <!-- Imagem oficial do Pokémon -->
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png" 
               alt="${pokemon.name}" 
               class="w-full h-24 object-contain mb-2" 
               onerror="this.onerror=null;this.src='${pokemon.sprites.front_default}'">
          
          <!-- Número do Pokémon formatado com zeros à esquerda -->
          <h3 class="text-white font-bold text-sm mb-1">#${pokemon.id.toString().padStart(4, '0')}</h3>
          
          <!-- Nome do Pokémon em maiúsculas -->
          <p class="text-green-400 text-xs font-medium mb-2">${pokemon.name.toUpperCase()}</p>
          
          <!-- Tipos do Pokémon -->
          <div class="flex justify-center gap-1">
            ${pokemon.types.map(type => `
              <span class="type-${type.type.name} px-2 py-1 rounded text-xs text-white font-bold">
                ${this.translateType(type.type.name).substring(0, 3)}
              </span>
            `).join('')}
          </div>
        </div>
      `;
      
      grid.appendChild(card);
    });
  }

  /**
   * === BUSCA DINÂMICA ===
   * Filtra Pokémon em tempo real conforme o usuário digita
   * FUNCIONA COM TODOS OS 1010+ POKÉMON E CONSIDERA FILTROS ATIVOS!
   */
  dynamicSearch(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
      // Se campo vazio, reaplica filtros ativos
      this.applyActiveFilters();
      return;
    }
    
    // Determina base de dados considerando filtros ativos
    let baseData = [...this.allPokemon];
    
    // Aplica filtro de região se ativo
    if (this.currentRegion) {
      const region = this.regions[this.currentRegion];
      baseData = baseData.filter(pokemon => 
        pokemon.id >= region.start && pokemon.id <= region.end
      );
    }
    
    // Aplica filtro de tipo se ativo
    if (this.currentType) {
      baseData = baseData.filter(pokemon => 
        pokemon.types.some(t => t.type.name === this.currentType)
      );
    }
    
    // Filtra por termo de busca
    this.filteredPokemon = baseData.filter(pokemon => {
      const nameMatch = pokemon.name.toLowerCase().includes(term);
      const idMatch = pokemon.id.toString().includes(term);
      const paddedIdMatch = pokemon.id.toString().padStart(4, '0').includes(term);
      
      return nameMatch || idMatch || paddedIdMatch;
    });
    
    this.renderPokemon();
    this.updateStatus();
  }

  /**
   * === APLICAR FILTROS ATIVOS ===
   * Reaplica todos os filtros atualmente ativos
   */
  applyActiveFilters() {
    let filtered = [...this.allPokemon];
    
    // Aplica filtro de região se ativo
    if (this.currentRegion) {
      const region = this.regions[this.currentRegion];
      filtered = filtered.filter(pokemon => 
        pokemon.id >= region.start && pokemon.id <= region.end
      );
    }
    
    // Aplica filtro de tipo se ativo
    if (this.currentType) {
      filtered = filtered.filter(pokemon => 
        pokemon.types.some(t => t.type.name === this.currentType)
      );
    }
    
    this.filteredPokemon = filtered;
    this.renderPokemon();
    this.updateStatus();
  }

  /**
   * === FILTRO POR REGIÃO ===
   * Filtra Pokémon por região selecionada
   */
  filterByRegion() {
    const selectedRegion = document.getElementById('regionFilter').value;
    this.currentRegion = selectedRegion;
    
    // Limpa campo de busca quando muda filtro
    document.getElementById('searchInput').value = '';
    
    // Aplica filtros ativos
    this.applyActiveFilters();
  }

  /**
   * === FILTRO POR TIPO ===
   * Filtra Pokémon por tipo selecionado
   */
  filterByType() {
    const selectedType = document.getElementById('typeFilter').value;
    this.currentType = selectedType;
    
    // Limpa campo de busca quando muda filtro
    document.getElementById('searchInput').value = '';
    
    // Aplica filtros ativos
    this.applyActiveFilters();
  }

  /**
   * === BUSCA DE POKÉMON ===
   * Busca um Pokémon específico por nome ou número (abre modal)
   */
  async searchPokemon() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    if (!searchTerm) return;

    this.showLoading();
    
    try {
      // Faz requisição para API com termo de busca
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${searchTerm}`);
      if (response.ok) {
        const pokemon = await response.json();
        this.showPokemonDetails(pokemon.id);  // Mostra detalhes diretamente
      } else {
        alert('Pokémon não encontrado!');
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      alert('Erro na busca. Tente novamente.');
    }
    
    this.hideLoading();
  }

  /**
   * === POKÉMON ALEATÓRIO ===
   * Exibe um Pokémon escolhido aleatoriamente
   */
  async showRandomPokemon() {
    // Gera ID aleatório entre 1 e 1010 (todos os Pokémon disponíveis na API)
    const randomId = Math.floor(Math.random() * 1010) + 1;
    await this.showPokemonDetails(randomId);
  }

  /**
   * === EXIBIÇÃO DE DETALHES ===
   * Mostra informações detalhadas de um Pokémon no modal
   */
  async showPokemonDetails(id) {
    this.currentPokemonId = id;
    this.showLoading();
    
    try {
      // Busca dados do Pokémon e da espécie em paralelo
      const [pokemon, species] = await Promise.all([
        fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(r => r.json()),
        fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`).then(r => r.json())
      ]);

      // Busca descrição em inglês (mais disponível que português)
      const description = species.flavor_text_entries
        .find(entry => entry.language.name === 'en')?.flavor_text
        .replace(/\f/g, ' ') || 'Descrição não disponível';

      // Define título do modal
      document.getElementById('modalTitle').textContent = 
        `${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} #${pokemon.id.toString().padStart(4, '0')}`;
      
      // Constrói HTML do conteúdo do modal
      document.getElementById('modalContent').innerHTML = `
        <div class="grid md:grid-cols-2 gap-6">
          <!-- Coluna da imagem e tipos -->
          <div class="text-center">
            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png" 
                 alt="${pokemon.name}" 
                 class="w-48 h-48 mx-auto object-contain mb-4" 
                 onerror="this.onerror=null;this.src='${pokemon.sprites.front_default}'">
            
            <!-- Tags dos tipos -->
            <div class="flex justify-center gap-2 mb-4">
              ${pokemon.types.map(type => `
                <span class="type-${type.type.name} px-3 py-1 rounded-full text-sm text-white font-medium">
                  ${this.translateType(type.type.name)}
                </span>
              `).join('')}
            </div>
          </div>
          
          <!-- Coluna de informações -->
          <div>
            <!-- Descrição -->
            <p class="text-white/80 mb-6">${description}</p>
            
            <!-- Dados básicos -->
            <div class="space-y-3">
              <div class="flex justify-between">
                <span class="text-white/60">Altura:</span>
                <span class="text-white">${pokemon.height / 10}m</span>
              </div>
              <div class="flex justify-between">
                <span class="text-white/60">Peso:</span>
                <span class="text-white">${pokemon.weight / 10}kg</span>
              </div>
              <div class="flex justify-between">
                <span class="text-white/60">Experiência Base:</span>
                <span class="text-white">${pokemon.base_experience}</span>
              </div>
            </div>
            
            <!-- Estatísticas base -->
            <h4 class="text-white font-semibold mt-6 mb-3">Estatísticas Base</h4>
            <div class="space-y-2">
              ${pokemon.stats.map(stat => `
                <div>
                  <!-- Nome e valor da estatística -->
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-white/60">${this.translateStat(stat.stat.name)}:</span>
                    <span class="text-white">${stat.base_stat}</span>
                  </div>
                  <!-- Barra de progresso -->
                  <div class="w-full bg-white/10 rounded-full h-2">
                    <div class="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full" 
                         style="width: ${Math.min(stat.base_stat / 2, 100)}%"></div>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Habilidades -->
            <h4 class="text-white font-semibold mt-6 mb-3">Habilidades</h4>
            <div class="flex flex-wrap gap-2">
              ${pokemon.abilities.map(ability => `
                <span class="bg-white/10 px-3 py-1 rounded-full text-sm text-white">
                  ${ability.ability.name.replace('-', ' ')}
                  ${ability.is_hidden ? ' (Oculta)' : ''}
                </span>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      // Mostra o modal
      document.getElementById('pokemonModal').classList.remove('hidden');
      document.getElementById('pokemonModal').classList.add('flex');
    } catch (error) {
      console.error('Erro ao carregar detalhes do Pokémon:', error);
    }
    
    this.hideLoading();
  }

  /**
   * === NAVEGAÇÃO - POKÉMON ANTERIOR ===
   * Navega para o Pokémon anterior no modal
   */
  previousPokemon() {
    if (this.currentPokemonId > 1) {
      this.showPokemonDetails(this.currentPokemonId - 1);
    }
  }

  /**
   * === NAVEGAÇÃO - PRÓXIMO POKÉMON ===
   * Navega para o próximo Pokémon no modal
   */
  nextPokemon() {
    if (this.currentPokemonId < 1010) {
      this.showPokemonDetails(this.currentPokemonId + 1);
    }
  }

  /**
   * === FECHAR MODAL ===
   * Fecha o modal de detalhes
   */
  closeModal() {
    document.getElementById('pokemonModal').classList.add('hidden');
    document.getElementById('pokemonModal').classList.remove('flex');
  }

  /**
   * === TRADUÇÃO DE TIPOS ===
   * Converte nomes de tipos do inglês para português
   */
  translateType(type) {
    const types = {
      normal: 'Normal',
      fire: 'Fogo', 
      water: 'Água', 
      electric: 'Elétrico',
      grass: 'Planta', 
      ice: 'Gelo', 
      fighting: 'Lutador', 
      poison: 'Veneno',
      ground: 'Terra', 
      flying: 'Voador', 
      psychic: 'Psíquico', 
      bug: 'Inseto',
      rock: 'Pedra', 
      ghost: 'Fantasma', 
      dragon: 'Dragão', 
      dark: 'Sombrio',
      steel: 'Aço', 
      fairy: 'Fada'
    };
    return types[type] || type;
  }

  /**
   * === TRADUÇÃO DE ESTATÍSTICAS ===
   * Converte nomes de stats do inglês para português
   */
  translateStat(stat) {
    const stats = {
      hp: 'HP',
      attack: 'Ataque', 
      defense: 'Defesa',
      'special-attack': 'Ataque Esp.', 
      'special-defense': 'Defesa Esp.',
      speed: 'Velocidade'
    };
    return stats[stat] || stat;
  }

  /**
   * === ATUALIZAÇÃO DE STATUS ===
   * Atualiza informações na barra de status
   */
  updateStatus() {
    // Atualiza total encontrado
    if (document.getElementById('totalFound')) {
      document.getElementById('totalFound').textContent = this.filteredPokemon.length;
    }
    
    // Atualiza região atual
    if (document.getElementById('currentRegion')) {
      document.getElementById('currentRegion').textContent = 
        this.currentRegion ? this.regions[this.currentRegion].name : 'TODAS';
    }
    
    // Atualiza filtro de tipo atual
    if (document.getElementById('currentFilter')) {
      document.getElementById('currentFilter').textContent = 
        this.currentType ? this.translateType(this.currentType) : 'TODOS';
    }
  }

  /**
   * === MOSTRAR CARREGAMENTO ===
   * Exibe tela de loading
   */
  showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'flex';
    }
  }

  /**
   * === OCULTAR CARREGAMENTO ===
   * Esconde tela de loading
   */
  hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }
}

// === INICIALIZAÇÃO DA APLICAÇÃO ===
// Cria instância da aplicação quando a página carrega
const app = new PokedexApp();

// Torna a instância global para acesso via HTML (onclick handlers)
window.app = app;
