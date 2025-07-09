// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
// PASTE YOUR FIREBASE CONFIGURATION OBJECT HERE!
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyA65tqGUqW87kwR4sBYrm24CyRjgCNp_mM",
    authDomain: "schedullmer.firebaseapp.com",
    databaseURL: "https://schedullmer-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "schedullmer",
    storageBucket: "schedullmer.firebasestorage.app",
    messagingSenderId: "558643959004",
    appId: "1:558643959004:web:2634da400f1799e479d019",
    measurementId: "G-74EX9FCQ63"
  };
// 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const dbRef = ref(database, 'llm_meeting_votes_v2'); // Using a new path for the new times

// --- APP STATE & CONFIG ---

const attendees = ["Dan Morris", "Drew Purves", "Luke Barrington", "Craig Mills"];
let currentUser = "";
let winnerFound = false;

// Define proposed time slots in UTC. This is the source of truth!
// Pacific Time (PT) is UTC-7 in July (PDT).
// Thurs Jul 10, 7am PT -> 14:00 UTC
// Fri Jul 11, 7am PT -> 14:00 UTC
// Tue Jul 15, 5am PT -> 12:00 UTC
// Wed Jul 16, 7:30am PT -> 14:30 UTC
// Thu Jul 17, 7am PT -> 14:00 UTC
const timeSlots = [
    { id: 'slot1', utc: '2024-07-10T14:00:00Z' }, // Thurs Jul 10: 7am PT
    { id: 'slot2', utc: '2024-07-11T14:00:00Z' }, // Fri Jul 11: 7am PT
    { id: 'slot3', utc: '2024-07-15T12:00:00Z' }, // Tue Jul 15: 5am PT
    { id: 'slot4', utc: '2024-07-16T14:30:00Z' }, // Wed Jul 16: 7:30am PT
    { id: 'slot5', utc: '2024-07-17T14:00:00Z' }  // Thu Jul 17: 7am PT
];


// --- DOM ELEMENTS ---

const userSelector = document.getElementById('user-selector');
const schedulerList = document.getElementById('scheduler');
const welcomeMessage = document.getElementById('welcome-message');
const winnerBanner = document.getElementById('winner-banner');
const successTune = document.getElementById('success-tune'); // Get the audio element

// --- FUNCTIONS ---

// Populate the user dropdown
function populateUsers() {
    attendees.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        userSelector.appendChild(option);
    });
}

// Render all the time slots
function renderSlots() {
    schedulerList.innerHTML = ''; // Clear existing list
    timeSlots.forEach(slot => {
        const date = new Date(slot.utc);

        // This is the magic for timezones!
        const localTime = date.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
        const sfTime = date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', timeStyle: 'short', weekday: 'short' });
        const dublinTime = date.toLocaleString('en-IE', { timeZone: 'Europe/Dublin', timeStyle: 'short', weekday: 'short' });
        const londonTime = date.toLocaleString('en-GB', { timeZone: 'Europe/London', timeStyle: 'short', weekday: 'short' });

        const listItem = document.createElement('li');
        listItem.id = slot.id;
        listItem.innerHTML = `
            <div class="slot-container">
                <div class="slot-checkbox">
                    <input type="checkbox" id="check-${slot.id}" data-slot-id="${slot.id}" disabled>
                </div>
                <div class="time-info">
                    <h3>${localTime}</h3>
                    <div class="timezones">
                        <span>SF: ${sfTime}</span> | 
                        <span>DUB: ${dublinTime}</span> | 
                        <span>LON: ${londonTime}</span>
                    </div>
                </div>
                <div class="voters" id="voters-${slot.id}"></div>
            </div>
        `;
        schedulerList.appendChild(listItem);

        // Add event listener for the new checkbox
        document.getElementById(`check-${slot.id}`).addEventListener('change', handleVote);
    });
}

// Handle user selection
function selectUser(event) {
    currentUser = event.target.value;
    if (currentUser) {
        welcomeMessage.textContent = `Hi ${currentUser}! Ready to shape the future?`;
        // Enable all checkboxes
        document.querySelectorAll('.slot-checkbox input').forEach(cb => cb.disabled = false);
    } else {
        welcomeMessage.textContent = '';
        // Disable all checkboxes
        document.querySelectorAll('.slot-checkbox input').forEach(cb => cb.disabled = true);
    }
    // We need to re-render the votes to apply the 'you' style
    fetchVotes();
}

// Handle a user voting
function handleVote(event) {
    const slotId = event.target.dataset.slotId;
    const isChecked = event.target.checked;
    const voteRef = ref(database, `llm_meeting_votes_v2/${slotId}/${currentUser}`);
    
    // Set the vote in Firebase (or remove it if unchecked)
    set(voteRef, isChecked ? true : null);
}

// Fetch votes from Firebase and update UI
function fetchVotes() {
    onValue(dbRef, (snapshot) => {
        if(winnerFound) return; // Stop listening if we already have a winner

        const allVotes = snapshot.val() || {};
        
        // Update UI for each slot
        timeSlots.forEach(slot => {
            const slotVotes = allVotes[slot.id] || {};
            const voters = Object.keys(slotVotes);

            // Update checkbox
            const checkbox = document.getElementById(`check-${slot.id}`);
            if (checkbox) {
                checkbox.checked = voters.includes(currentUser);
            }

            // Update voter list display
            const voterListEl = document.getElementById(`voters-${slot.id}`);
            if (voterListEl) {
                voterListEl.innerHTML = voters.map(voter => 
                    `<span class="${voter === currentUser ? 'you' : ''}">${voter.split(' ')[0]}</span>`
                ).join('');
            }

            // Check for a winner!
            if (voters.length === attendees.length) {
                console.log("WE HAVE A WINNER!", slot.id);
                triggerCelebration(slot.id);
            }
        });
    });
}

// The grand finale!
function triggerCelebration(winningSlotId) {
    winnerFound = true; // Stop any further updates
    
    // Highlight the winning row
    document.querySelectorAll('#scheduler li').forEach(li => {
        li.style.opacity = '0.3';
    });
    const winnerEl = document.getElementById(winningSlotId);
    winnerEl.style.opacity = '1';
    winnerEl.style.backgroundColor = '#FFFACD'; // Lemon Chiffon, very classy
    
    // Disable all controls
    userSelector.disabled = true;
    document.querySelectorAll('.slot-checkbox input').forEach(cb => cb.disabled = true);
    
    // Show the banner
    winnerBanner.classList.remove('hidden');

    // Play the success tune!
    successTune.play().catch(e => console.error("Audio playback failed:", e));
    
    // Make it rain confetti!
    confetti({
        particleCount: 200,
        spread: 90,
        origin: { y: 0.6 }
    });
}

// --- INITIALIZE APP ---

populateUsers();
renderSlots();
fetchVotes();

// Add event listener for the user selector
userSelector.addEventListener('change', selectUser);