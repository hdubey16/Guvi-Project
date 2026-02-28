/* =====================================================
   GUVI — Login Page JavaScript
   Interactive login with shake, ripple, focus-pulse, toast progress
   ===================================================== */

$(document).ready(function () {

    // ── Redirect if already logged in ──
    if (localStorage.getItem('guvi_token')) {
        window.location.href = 'profile.html';
        return;
    }

    // ── Toast Notification (with progress bar) ──
    function showToast(message, type = 'info', duration = 4500) {
        const icons = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };
        const $toast = $('<div class="toast ' + type + '">' +
            '<i class="bi ' + icons[type] + '"></i>' +
            '<span>' + message + '</span>' +
            '<div class="toast-progress" style="animation-duration:' + duration + 'ms"></div>' +
            '</div>');
        $('#toast-container').append($toast);
        setTimeout(function () {
            $toast.addClass('removing');
            setTimeout(function () { $toast.remove(); }, 300);
        }, duration);
    }

    // ── Shake Element ──
    function shake($el) {
        $el.addClass('shake');
        setTimeout(function () { $el.removeClass('shake'); }, 500);
    }

    // ── Success Checkmark Animation ──
    function showSuccessCheck() {
        const $overlay = $('<div style="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);animation:fadeIn .3s ease">' +
            '<div style="width:100px;height:100px;border-radius:50%;background:var(--success);display:flex;align-items:center;justify-content:center;animation:fadeInUp .4s ease;box-shadow:0 0 40px rgba(0,200,83,.5)">' +
            '<i class="bi bi-check-lg" style="font-size:3rem;color:#fff"></i>' +
            '</div></div>');
        $('body').append($overlay);
        setTimeout(function () {
            $overlay.fadeOut(400, function () { $overlay.remove(); });
        }, 1200);
    }

    // ── Ripple on buttons ──
    $(document).on('click', '.btn', function (e) {
        const $btn = $(this);
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const $ripple = $('<span class="ripple"></span>').css({
            width: size + 'px', height: size + 'px',
            left: (e.clientX - rect.left - size / 2) + 'px',
            top: (e.clientY - rect.top - size / 2) + 'px'
        });
        $btn.append($ripple);
        setTimeout(function () { $ripple.remove(); }, 600);
    });

    // ── Focus Pulse ──
    $(document).on('focus', '.form-control', function () {
        $(this).addClass('focus-pulse');
        const $this = $(this);
        setTimeout(function () { $this.removeClass('focus-pulse'); }, 300);
    });

    // ── Password Visibility Toggle ──
    $('.toggle-btn').click(function () {
        const targetId = $(this).data('target');
        const $input = $('#' + targetId);
        const $icon = $(this).find('i');
        if ($input.attr('type') === 'password') {
            $input.attr('type', 'text');
            $icon.removeClass('bi-eye-slash').addClass('bi-eye');
        } else {
            $input.attr('type', 'password');
            $icon.removeClass('bi-eye').addClass('bi-eye-slash');
        }
    });

    // ── Email Validation ──
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    $('#email').on('input', function () {
        const val = $(this).val().trim();
        const $hint = $('#emailHint');
        if (!val) {
            $(this).removeClass('is-valid is-invalid');
            $hint.text('');
        } else if (emailRegex.test(val)) {
            $(this).removeClass('is-invalid').addClass('is-valid');
            $hint.text('');
        } else {
            $(this).removeClass('is-valid').addClass('is-invalid');
            $hint.text('Enter a valid email.').addClass('error');
        }
    });

    // ── Form Submit ──
    $('#loginForm').on('submit', function (e) {
        e.preventDefault();

        const email = $('#email').val().trim();
        const password = $('#password').val();

        // Validate with shake feedback
        if (!email || !password) {
            showToast('Please fill in all fields.', 'warning');
            if (!email) shake($('#email'));
            if (!password) shake($('#password'));
            return;
        }
        if (!emailRegex.test(email)) {
            showToast('Please enter a valid email address.', 'error');
            shake($('#email').closest('.form-group'));
            $('#email').focus();
            return;
        }

        // Set loading state
        const $btn = $('#submitBtn');
        $btn.addClass('btn-loading');
        $btn.find('.spinner').show();

        // AJAX Login
        $.ajax({
            url: 'php/login.php',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                email: email,
                password: password
            }),
            dataType: 'json',
            success: function (res) {
                if (res.success) {
                    // Store session data
                    localStorage.setItem('guvi_token', res.token);
                    localStorage.setItem('guvi_email', res.email);
                    localStorage.setItem('guvi_user_id', res.user_id);

                    showSuccessCheck();
                    showToast('Login successful! Redirecting...', 'success');
                    setTimeout(function () {
                        window.location.href = 'profile.html';
                    }, 1500);
                } else {
                    showToast(res.message || 'Login failed.', 'error');
                    shake($('#loginForm'));
                }
            },
            error: function (xhr) {
                let msg = 'Something went wrong. Please try again.';
                try {
                    const res = JSON.parse(xhr.responseText);
                    if (res.message) msg = res.message;
                } catch (e) {}
                showToast(msg, 'error');
                shake($('#loginForm'));
            },
            complete: function () {
                $btn.removeClass('btn-loading');
                $btn.find('.spinner').hide();
            }
        });
    });

    // ── Mobile Nav Toggle ──
    $('#navToggle').click(function () {
        $('#navLinks').toggleClass('show');
    });

    // ── Pre-fill email from registration redirect ──
    const regEmail = sessionStorage.getItem('guvi_registered_email');
    if (regEmail) {
        $('#email').val(regEmail).trigger('input');
        sessionStorage.removeItem('guvi_registered_email');
        showToast('Registration successful! Please sign in.', 'success');
    }

});
