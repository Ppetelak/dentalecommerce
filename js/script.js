$(document).ready(function () {
    $('.next').click(function () {
        var activeTab = $('.tab-pane.active');
        var nextTab = activeTab.next('.tab-pane');
        var activeProgress = $('.progress-bar');
        var progressValue = (nextTab.index() / ($('.tab-pane').length - 1)) * 100;
        if (nextTab.length > 0) {
            activeTab.removeClass('show active');
            nextTab.addClass('show active');
            activeProgress.width(progressValue + '%').attr('aria-valuenow', progressValue);
        }
    });

    $('.prev').click(function () {
        var activeTab = $('.tab-pane.active');
        var prevTab = activeTab.prev('.tab-pane');
        var activeProgress = $('.progress-bar');
        var progressValue = (prevTab.index() / ($('.tab-pane').length - 1)) * 100;
        if (prevTab.length > 0) {
            activeTab.removeClass('show active');
            prevTab.addClass('show active');
            activeProgress.width(progressValue + '%').attr('aria-valuenow', progressValue);
        }
    });
    $('#titularresponsavelfinanceiro').change(function () {
        var selectedOption = $(this).val();
        if (selectedOption === 'Não') {
            $('#Naoeresponsavel').show();
        } else {
            $('#Naoeresponsavel').hide();
        }
    });
});