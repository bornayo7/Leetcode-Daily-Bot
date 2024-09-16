module.exports = {
	customID: 'poke ID',
	async execute(interaction, client) {
		await interaction.reply({
			content: 'Ouch that hurts! :c',
			ephemeral: true
		});
	}
}