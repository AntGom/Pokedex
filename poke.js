'use strict'

//* ELEMENTOS NECESARIOS DEL DOM *//
const getDOMElements = () => ({
  // Búsqueda y navegación
  pokemonInput: document.getElementById('pokemonInput'),
  searchButton: document.getElementById('searchButton'),
  searchIcon: document.getElementById('searchButton').querySelector('.pokeGo'),
  prevButton: document.getElementById('prevButton'),
  nextButton: document.getElementById('nextButton'),

  // Mesajes de error
  errorMessage: document.getElementById('errorMessage'),
  
  // Información del Pokémon
  pokemonInfo: document.getElementById('pokemonInfo'),
  pokemonNameElement: document.getElementById('pokemonName'),
  pokemonImage: document.getElementById('pokemonImage'),
  pokemonTypesContainer: document.getElementById('pokemonTypesContainer'),
  pokemonNumber: document.getElementById('pokemonNumber'),
  pokemonAbilities: document.getElementById('pokemonAbilities'),
  pokemonHeight: document.getElementById('pokemonHeight'),
  pokemonWeight: document.getElementById('pokemonWeight'),
  pokemonDescription: document.getElementById('pokemonDescription'),
  statsGrid: document.getElementById('statsGrid'),
  evolutionChain: document.getElementById('evolutionChain')
});

// Variables globales
const elements = getDOMElements();
let currentPokemonId = null;
const API_BASE_URL = 'https://pokeapi.co/api/v2';


//* GESTIÓN MENSAJES ERROR *//
const showError = (message) => {
  elements.errorMessage.textContent = message;
  elements.errorMessage.style.display = 'block';
  elements.pokemonInfo.classList.add('hidden');
};

const clearError = () => {
  elements.errorMessage.style.display = 'none';
  elements.errorMessage.textContent = '';
};


//* PETICIONES Y OBTENCIÓN DE DATOS *//
const fetchAllPokemonData = async (nameOrId) => {
  try {
    // Datos básicos del Pokémon(nombre, id, tipos, habilidades, caract, especie)
    const pokemonDataResponse = await fetch(`${API_BASE_URL}/pokemon/${nameOrId}`);
    const pokemonData = await pokemonDataResponse.json();

    // Datos de la especie (descripción y evolución)
    const speciesDataResponse = await fetch(`${API_BASE_URL}/pokemon-species/${pokemonData.id}`);
    const speciesData = await speciesDataResponse.json();

    // Datos de la cadena evolutiva
    const evolutionDataResponse = await fetch(speciesData.evolution_chain.url);
    const evolutionData = await evolutionDataResponse.json();

    // Procesar nombres de las evoluciones
    const getEvolutionNames = (chain, names = []) => {
      names.push(chain.species.name);
      chain.evolves_to.forEach(evo => getEvolutionNames(evo, names));
      return names;
    };

    const evolutionNames = getEvolutionNames(evolutionData.chain);

    // Datos de cada Pokemon de la cadena evolutiva
    const evolutionPokemonData = await Promise.all(
      evolutionNames.map(async (name) => {
        const res = await fetch(`${API_BASE_URL}/pokemon/${name}`);
        return res.ok ? res.json() : null;
      })
    );

    return {
      pokemon: pokemonData,
      species: speciesData,
      evolution: {
        chain: evolutionData.chain,
        pokemonData: evolutionPokemonData,
      }
    };

  } catch (error) {
    console.error('Error obteniendo datos:', error);
    return null;
  }
};


//* ACTUALIZACIÓN DE LA INTERFAZ *//
const updateNavigationButtons = (data) => {
  currentPokemonId = data.pokemon.id;
  elements.prevButton.disabled = currentPokemonId === 1;
  elements.nextButton.disabled = currentPokemonId === 1025;
};

const updatePokemonInfo = (data) => {
  // Actualizar imagen principal
  elements.pokemonImage.src = data.pokemon.sprites.other['official-artwork'].front_default;

  // Ver los tipos del Pokemon
  elements.pokemonTypesContainer.innerHTML = data.pokemon.types
    .map(type => `
      <span class="type-badge type-${type.type.name}">
        ${type.type.name}
      </span>
    `).join('');

  // Actualizar información básica
  elements.pokemonNameElement.textContent = data.pokemon.name.charAt(0).toUpperCase() + data.pokemon.name.slice(1);
  elements.pokemonNumber.textContent = `#${String(data.pokemon.id)}`;
  elements.pokemonHeight.textContent = `${(data.pokemon.height / 10)} m`;
  elements.pokemonWeight.textContent = `${(data.pokemon.weight / 10)} kg`;

  // Mostrar habilidades
  elements.pokemonAbilities.textContent = data.pokemon.abilities
    .map(ability => ability.ability.name.charAt(0).toUpperCase() + ability.ability.name.slice(1))
    .join(', ');

  // Actualizar estadísticas
  data.pokemon.stats.forEach(stat => {
    const statElement = elements.statsGrid.querySelector(`[data-stat="${stat.stat.name}"]`);
    if (statElement) {
      statElement.textContent = stat.base_stat;
    }
  });

  // Descripción (español)
  const description = data.species.flavor_text_entries.find(entry => entry.language.name === 'es');
  elements.pokemonDescription.textContent = description ? description.flavor_text : 'No hay descripción disponible.';
};

const displayEvolutionChain = (data) => {
  // Pintar la cadena evolutiva
  elements.evolutionChain.innerHTML = data.pokemonData.map((pokemon, index) => `
      <div class="evolution-item" data-name="${pokemon.name}">
        <img src="${pokemon.sprites.other['official-artwork'].front_default}" alt="${pokemon.name}">
        <p>${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</p> 
      </div>
      ${index < data.pokemonData.length - 1 ? '<div class="evolution-arrow">➜</div>' : ''}
    `).join('');

  // Click a las evoluciones
  document.querySelectorAll('.evolution-item').forEach(item => {
    item.addEventListener('click', () => {
      elements.pokemonInput.value = item.dataset.name;
      searchPokemon();
    });
  });
};


//* FUNCIÓN PRINCIPAL DE BÚSQUEDA *//
const searchPokemon = async (pokemonId) => {
  const pokemonName = pokemonId || elements.pokemonInput.value;
  if (!pokemonName) return showError('Tienes que escribir un nombre válido o un ID de algún Pokémon');
  
  // Indicador de carga
  elements.searchButton.disabled = true;
  elements.searchIcon.src = './pokeball1.png';
  clearError();

  // Obtener y procesar datos
  const data = await fetchAllPokemonData(pokemonName);
  
  if (!data) {
    showError('Pokémon no encontrado. Inténtalo de nuevo.');
    elements.searchButton.disabled = false;
    elements.searchIcon.src = './poke2.png';
    return;
  }

  // Actualizar toda la interfaz
  updateNavigationButtons(data);
  updatePokemonInfo(data);
  displayEvolutionChain(data.evolution);

  // Hacer que la información sea visible
  elements.pokemonInfo.classList.remove('hidden');
  elements.pokemonInfo.classList.add('visible');

  // Restaurar botón de búsqueda
  elements.searchButton.disabled = false;
  elements.searchIcon.src = './poke2.png';
};

//* EVENTOS BUSQUEDA Y NAVEGACION *//
elements.searchButton.addEventListener('click', () => searchPokemon());
elements.pokemonInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') searchPokemon();
});

elements.prevButton.addEventListener('click', () => 
  currentPokemonId > 1 && searchPokemon(--currentPokemonId)
);
elements.nextButton.addEventListener('click', () => 
  currentPokemonId < 1025 && searchPokemon(++currentPokemonId)
);