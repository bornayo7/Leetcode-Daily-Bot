module.exports = {
	customID: 'poke me',
	async execute(interaction, client) {
		await interaction.reply({
			content: 'Ouch that hurts! :c',
			ephemeral: true
		});
	}
}