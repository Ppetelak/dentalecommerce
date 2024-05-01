const formCartao = document.querySelector('#form-cartao')
const cardBox = formCartao.querySelector('div.card-content-box')
const btnRotateCard = formCartao.querySelector('#rotate-card')
const btnSubmit = formCartao.querySelector('#input-submit')


const inputNumber = formCartao.querySelector('#input-number')
const inputNumberInfo = formCartao.querySelector('#input-number + .info')
const inputName = formCartao.querySelector('#input-name')
const inputNameInfo = formCartao.querySelector('#input-name + .info')
const inputCvv = formCartao.querySelector('#input-cvv')
const inputCvvInfo = formCartao.querySelector('#input-cvv + .info')
const inputValidate = formCartao.querySelector('#input-validate')
const inputValidateInfo = formCartao.querySelector('#input-validate + .info')

const cardViewName = formCartao.querySelector('#card-user-name');
const cardViewNumber = formCartao.querySelector('#card-user-number');
const cardViewCvv = formCartao.querySelector('#card-user-cvv');
const cardViewDate = formCartao.querySelector('#card-user-date');


inputNumber.onblur = (e) => {
	const value = e.target.value;
	const valueReplace = value.replaceAll(' ', '')


	if(value.length <= 0){
		const message = "Preenchimento obrigatório!"
		inputNumberInfo.querySelector('.message').innerText = message
		inputNumberInfo.classList.add('visible')
		btnSubmit.classList.add('disable')
		return false;
	}

	if(!/^[0-9]{16}$/.test(valueReplace)){
		const message = "Use apenas números, e verifique se estão completos!"
		inputNumberInfo.querySelector('.message').innerText = message
		inputNumberInfo.classList.add('visible')
		btnSubmit.classList.add('disable')
		return false;
	}

	inputNumberInfo.querySelector('.message').innerText = ''
	inputNumberInfo.classList.remove('visible')

	canSubmit();
}

inputName.onblur = (e) => {
	const value = e.target.value;
	const valueReplace = value.replaceAll(' ', '')


	if(value.length <= 0){
		const message = "Preenchimento obrigatório!"
		inputNameInfo.querySelector('.message').innerText = message
		inputNameInfo.classList.add('visible')
		btnSubmit.classList.add('disable')
		return false;
	}

	if(!/^[a-z]+$/i.test(valueReplace)){
		const message = "Insira seu nome de forma correcta!"
		inputNameInfo.querySelector('.message').innerText = message
		inputNameInfo.classList.add('visible')
		btnSubmit.classList.add('disable')
		return false;
	}

	inputNameInfo.querySelector('.message').innerText = ''
	inputNameInfo.classList.remove('visible')
	canSubmit();
}

inputValidate.onblur = (e) => {
	const value = e.target.value;
	const valueReplace = value.replaceAll(' ', '')


	if(value.length <= 0){
		const message = "Preenchimento obrigatório!"
		inputValidateInfo.querySelector('.message').innerText = message
		inputValidateInfo.classList.add('visible')
		btnSubmit.classList.add('disable')
		return false;
	}

	if(!/^[0-9]{2}\/[0-9]{4}/i.test(valueReplace)){
		const message = `Use o padrão "mês/ano" EX. 01/2030`
		inputValidateInfo.querySelector('.message').innerText = message
		inputValidateInfo.classList.add('visible')
		btnSubmit.classList.add('disable')
		return false;
	}

	inputValidateInfo.querySelector('.message').innerText = ''
	inputValidateInfo.classList.remove('visible')
	canSubmit();
}

btnRotateCard.addEventListener('click', (e) => {
	cardBox.classList.toggle('rotate')
})

const handleName = (e) => {

	setTimeout(() => {

		const value = e.target.value

		cardViewName.innerText= value

	}, 100)
	canSubmit()
}

const handleNumber = (e) => {

	setTimeout(() => {

		const value = e.target.value


		if(value.length >= 20) {
			return false;
		}

		if(e.key == 'Backspace') {
			cardViewNumber.innerText = value
			return false
		}

		if(value.length == 4 || value.length == 9 || value.length == 14) {

			e.target.value += " "
		}

		cardViewNumber.innerText = value

	}, 0)
	canSubmit()
	
}

const handleCvv = (e) => {

	setTimeout(() => {

		const value = e.target.value


		cardViewCvv.innerText = value

	}, 0)
	canSubmit()
	
}

const handleValidate = (e) => {

	setTimeout(() => {

		const value = e.target.value


		cardViewDate.innerText = value

	}, 0)
	canSubmit()
}

inputCvv.onfocus = () => {
	cardBox.classList.remove('rotate')
}

inputCvv.onblur = () => {
	cardBox.classList.add('rotate')
	canSubmit();
}

function canSubmit(){
	
	const inputs = formCartao.querySelectorAll('input')

	for(let i = 0; i < inputs.length; i++){

		if(inputs[i].value.length <= 0){
			btnSubmit.classList.add('disable')
			return false;
		}
	}

	btnSubmit.classList.remove('disable')
}

canSubmit()