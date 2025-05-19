let chart;

async function loadData() {
    const bloodGroup = document.getElementById("bloodGroup").value;
    const futureYear = parseInt(document.getElementById("futureYear").value);

    if (!bloodGroup || !futureYear) {
        alert("Please select both blood group and future year");
        return;
    }

    const response = await fetch('./data/supply_demand.json');
    const data = await response.json();

    const groupData = data[bloodGroup];
    const allYears = Object.keys(groupData.supply).map(year => parseInt(year));

    const filteredYears = allYears.filter(year => year <= futureYear);
    const supply = filteredYears.map(year => groupData.supply[year]);
    const demand = filteredYears.map(year => groupData.demand[year]);

    if (chart) {
        chart.destroy();
    }

    const ctx = document.getElementById('myChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: filteredYears,
            datasets: [
                {
                    label: 'Supply',
                    data: supply,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.2)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Demand',
                    data: demand,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.2)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            },
            plugins: {
                title: {
                    display: true,
                    text: `Supply vs Demand for ${bloodGroup} up to ${futureYear}`,
                    font: {
                        size: 20
                    }
                },
                legend: {
                    labels: {
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            interaction: {
                mode: 'nearest',
                intersect: false
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Year',
                        font: {
                            size: 16
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Units',
                        font: {
                            size: 16
                        }
                    }
                }
            }
        }
    });

    // Show success message
    document.getElementById('successMessage').classList.remove('hidden');
}
